// lib/services/finance/customer-opening-balance.service.ts

import { PoolClient } from "pg";

type CustomerOpeningBalanceLine = {
  posting_date: string;
  party_id: string;
  party_code?: string | null;
  party_name: string;
  doc_type: "Invoice" | "Credit Note";
  doc_no: string;
  external_ref_no?: string | null;
  description?: string | null;
  currency_id: string;
  currency_code: string;
  debit: number;
  credit: number;
  exchange_rate: number;
};

type CustomerOpeningBalancePayload = {
  lines: CustomerOpeningBalanceLine[];
};

type CreatedCustomerOpeningBalance = {
  id: string;
  company_id: string;
  posting_date: string;
  party_id: string;
  party_code: string | null;
  party_name: string;
  doc_type: "Invoice" | "Credit Note";
  doc_no: string;
  external_ref_no: string | null;
  description: string | null;
  currency_id: string;
  currency_code: string;
  debit: string;
  credit: string;
  exchange_rate: string;
  amount_lcy: string;
};

export class CustomerOpeningBalanceService {
  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private static parsePayload(
    rawPayload: unknown,
  ): CustomerOpeningBalancePayload {
    if (!this.isRecord(rawPayload)) {
      throw new Error("Invalid request body");
    }

    const rawLines = rawPayload.lines;

    if (!Array.isArray(rawLines)) {
      throw new Error("lines must be an array");
    }

    if (rawLines.length === 0) {
      throw new Error("At least one customer opening balance line is required");
    }

    const lines: CustomerOpeningBalanceLine[] = rawLines.map(
      (rawLine, index) => {
        if (!this.isRecord(rawLine)) {
          throw new Error(`Invalid line at index ${index}`);
        }

        const postingDate = String(rawLine.posting_date ?? "").trim();
        const partyId = String(rawLine.party_id ?? "").trim();
        const partyName = String(rawLine.party_name ?? "").trim();
        const docType = String(rawLine.doc_type ?? "").trim();
        const docNo = String(rawLine.doc_no ?? "").trim();
        const currencyId = String(rawLine.currency_id ?? "").trim();
        const currencyCode = String(rawLine.currency_code ?? "").trim();

        if (!postingDate) {
          throw new Error(`Posting date is required on line ${index + 1}`);
        }

        if (!partyId) {
          throw new Error(`Customer is required on line ${index + 1}`);
        }

        if (!partyName) {
          throw new Error(`Customer name is required on line ${index + 1}`);
        }

        if (docType !== "Invoice" && docType !== "Credit Note") {
          throw new Error(
            `Invalid document type on customer line ${index + 1}`,
          );
        }

        if (!currencyId) {
          throw new Error(`Currency is required on line ${index + 1}`);
        }

        if (!currencyCode) {
          throw new Error(`Currency code is required on line ${index + 1}`);
        }

        const debit = Number(rawLine.debit ?? 0);
        const credit = Number(rawLine.credit ?? 0);
        const exchangeRate = Number(rawLine.exchange_rate ?? 1);

        if (!Number.isFinite(debit) || debit < 0) {
          throw new Error(`Invalid debit on line ${index + 1}`);
        }

        if (!Number.isFinite(credit) || credit < 0) {
          throw new Error(`Invalid credit on line ${index + 1}`);
        }

        if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
          throw new Error(`Invalid exchange rate on line ${index + 1}`);
        }

        if (debit > 0 && credit > 0) {
          throw new Error(
            `Debit and credit cannot both contain values on line ${index + 1}`,
          );
        }

        if (debit === 0 && credit === 0) {
          throw new Error(
            `Either debit or credit is required on line ${index + 1}`,
          );
        }

        return {
          posting_date: postingDate,
          party_id: partyId,
          party_code:
            rawLine.party_code === undefined ||
            rawLine.party_code === null ||
            String(rawLine.party_code).trim() === ""
              ? null
              : String(rawLine.party_code).trim(),
          party_name: partyName,
          doc_type: docType,
          doc_no: docNo,
          external_ref_no:
            rawLine.external_ref_no === undefined ||
            rawLine.external_ref_no === null
              ? null
              : String(rawLine.external_ref_no).trim(),
          description:
            rawLine.description === undefined || rawLine.description === null
              ? null
              : String(rawLine.description).trim(),
          currency_id: currencyId,
          currency_code: currencyCode,
          debit,
          credit,
          exchange_rate: exchangeRate,
        };
      },
    );

    return { lines };
  }

  static async create(
    client: PoolClient,
    companyId: string,
    rawPayload: unknown,
  ): Promise<CreatedCustomerOpeningBalance[]> {
    const payload = this.parsePayload(rawPayload);

    const createdRows: CreatedCustomerOpeningBalance[] = [];

    for (const line of payload.lines) {
      const partyResult = await client.query<{
        id: string;
        name: string;
        customer_code: string | null;
      }>(
        `
        SELECT
          p.id,
          p.name,
          p.customer_code
        FROM parties p
        WHERE
          p.id = $1
          AND p.company_id = $2
          AND p.party_type = 'customer'
        LIMIT 1
        `,
        [line.party_id, companyId],
      );

      if (!partyResult.rows.length) {
        throw new Error(
          `Customer not found or does not belong to this company: ${line.party_id}`,
        );
      }

      const currencyResult = await client.query<{
        id: string;
        code: string;
      }>(
        `
        SELECT
          id,
          code
        FROM currencies
        WHERE id = $1
        LIMIT 1
        `,
        [line.currency_id],
      );

      if (!currencyResult.rows.length) {
        throw new Error(`Currency not found: ${line.currency_id}`);
      }

      const party = partyResult.rows[0];
      const currency = currencyResult.rows[0];

      const result = await client.query<CreatedCustomerOpeningBalance>(
        `
        INSERT INTO customer_opening_balances (
          company_id,
          posting_date,

          party_id,
          party_code,
          party_name,

          doc_type,
          doc_no,
          external_ref_no,
          description,

          currency_id,
          currency_code,

          debit,
          credit,
          exchange_rate

        )
        VALUES (
          $1,
          $2,

          $3,
          $4,
          $5,

          $6,
          $7,
          $8,
          $9,

          $10,
          $11,

          $12,
          $13,
          $14
        )
        RETURNING
          id,
          company_id,
          posting_date::text AS posting_date,
          party_id,
          party_code,
          party_name,
          doc_type,
          doc_no,
          external_ref_no,
          description,
          currency_id,
          currency_code,
          debit::text AS debit,
          credit::text AS credit,
          exchange_rate::text AS exchange_rate,
          amount_lcy::text AS amount_lcy
        `,
        [
          companyId,
          line.posting_date,

          party.id,
          line.party_code ?? party.customer_code,
          party.name,

          line.doc_type,
          line.doc_no,
          line.external_ref_no,
          line.description,

          currency.id,
          currency.code,

          line.debit,
          line.credit,
          line.exchange_rate,
        ],
      );

      createdRows.push(result.rows[0]);
    }

    return createdRows;
  }
}
