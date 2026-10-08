// lib/services/finance/opening-balances/customer-supplier-opening-balance.service.ts

import type { PoolClient } from "pg";
import { pool } from "@/lib/db";

import type {
  OpeningBalanceCreatePayload,
  OpeningBalanceInput,
  OpeningBalancePartyType,
  OpeningBalanceRow,
} from "./customer-supplier-opening-balance.types";

type OpeningBalanceDbRow = {
  id: string;
  company_id: string;

  party_id: string;
  party_code: string | null;
  party_name: string | null;

  posting_date: string | Date;

  doc_type: string;
  doc_no: string | null;
  external_ref_no: string | null;

  description: string | null;

  currency_id: string | null;
  currency_code: string;

  debit: string | number | null;
  credit: string | number | null;

  exchange_rate: string | number | null;

  amount_lcy: string | number | null;

  created_at: string | Date;
  updated_at: string | Date;
};

type PartyDbRow = {
  id: string;
  code: string | null;
  name: string;
  currency_id: string | null;
};

export class CustomerSupplierOpeningBalanceService {
  private static getTableName(partyType: OpeningBalancePartyType): string {
    if (partyType === "customer") {
      return "customer_opening_balances";
    }

    return "supplier_opening_balances";
  }

  private static normalizeDate(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }

    return String(value).split("T")[0];
  }

  private static toNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const numberValue = Number(value);

    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private static mapRow(row: OpeningBalanceDbRow): OpeningBalanceRow {
    return {
      id: row.id,

      company_id: row.company_id,

      party_id: row.party_id,
      party_code: row.party_code,
      party_name: row.party_name || "",

      posting_date: this.normalizeDate(row.posting_date),

      doc_type: row.doc_type as OpeningBalanceRow["doc_type"],

      doc_no: row.doc_no || "",
      external_ref_no: row.external_ref_no || "",

      description: row.description || "",

      currency_id: row.currency_id,
      currency_code: row.currency_code,

      debit: this.toNumber(row.debit),
      credit: this.toNumber(row.credit),

      exchange_rate: this.toNumber(row.exchange_rate) || 1,

      amount_lcy: this.toNumber(row.amount_lcy),

      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),

      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    };
  }

  /**
   * Validate and normalize one incoming line.
   */
  private static normalizeInput(
    line: OpeningBalanceInput,
  ): OpeningBalanceInput {
    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    const exchangeRate = Number(line.exchange_rate ?? 1);

    if (!line.party_id) {
      throw new Error("Party is required");
    }

    if (!line.posting_date) {
      throw new Error("Posting date is required");
    }

    if (!line.currency_code) {
      throw new Error("Currency is required");
    }

    if (!Number.isFinite(debit) || debit < 0) {
      throw new Error("Debit must be a valid positive number");
    }

    if (!Number.isFinite(credit) || credit < 0) {
      throw new Error("Credit must be a valid positive number");
    }

    if (debit > 0 && credit > 0) {
      throw new Error("A line cannot have both debit and credit");
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error("Exchange rate must be greater than zero");
    }

    return {
      ...line,

      party_code: line.party_code || null,
      party_name: line.party_name || null,

      doc_no: line.doc_no || "",
      external_ref_no: line.external_ref_no || "",

      description: line.description || "",

      currency_id: line.currency_id || null,

      debit,
      credit,

      exchange_rate: exchangeRate,
    };
  }

  /**
   * Validate the entire POST payload.
   */
  private static validatePayload(
    rawPayload: unknown,
  ): OpeningBalanceCreatePayload {
    if (typeof rawPayload !== "object" || rawPayload === null) {
      throw new Error("Invalid request body");
    }

    const payload = rawPayload as Record<string, unknown>;

    if (!Array.isArray(payload.lines)) {
      throw new Error("lines must be an array");
    }

    const lines: OpeningBalanceInput[] = [];

    for (const rawLine of payload.lines) {
      if (typeof rawLine !== "object" || rawLine === null) {
        throw new Error("Invalid opening balance line");
      }

      const line = rawLine as Record<string, unknown>;

      const docType = line.doc_type;

      const allowedDocTypes = [
        "Invoice",
        "Credit Note",
        "Debit Note",
        "Payment",
        "Refund",
      ];

      if (typeof docType !== "string" || !allowedDocTypes.includes(docType)) {
        throw new Error("Invalid document type");
      }

      const normalizedLine = this.normalizeInput({
        party_id: String(line.party_id ?? ""),

        party_code:
          line.party_code === null || line.party_code === undefined
            ? null
            : String(line.party_code),

        party_name:
          line.party_name === null || line.party_name === undefined
            ? null
            : String(line.party_name),

        posting_date: String(line.posting_date ?? ""),

        doc_type: docType as OpeningBalanceInput["doc_type"],

        doc_no:
          line.doc_no === null || line.doc_no === undefined
            ? ""
            : String(line.doc_no),

        external_ref_no:
          line.external_ref_no === null || line.external_ref_no === undefined
            ? ""
            : String(line.external_ref_no),

        description:
          line.description === null || line.description === undefined
            ? ""
            : String(line.description),

        currency_id:
          line.currency_id === null || line.currency_id === undefined
            ? null
            : String(line.currency_id),

        currency_code: String(line.currency_code ?? ""),

        debit:
          line.debit === null || line.debit === undefined
            ? 0
            : Number(line.debit),

        credit:
          line.credit === null || line.credit === undefined
            ? 0
            : Number(line.credit),

        exchange_rate:
          line.exchange_rate === null || line.exchange_rate === undefined
            ? 1
            : Number(line.exchange_rate),
      });

      lines.push(normalizedLine);
    }

    return { lines };
  }

  /**
   * Check that the party belongs to the current company.
   */
  private static async validateParty(
    client: PoolClient,
    companyId: string,
    partyType: OpeningBalancePartyType,
    partyId: string,
  ): Promise<PartyDbRow> {
    const result = await client.query<PartyDbRow>(
      `
        SELECT
          id,
          code,
          name,
          currency_id
        FROM parties
        WHERE id = $1
          AND company_id = $2
          AND party_type = $3
        LIMIT 1
      `,
      [partyId, companyId, partyType],
    );

    if (!result.rows.length) {
      throw new Error(
        `${partyType === "customer" ? "Customer" : "Supplier"} not found`,
      );
    }

    return result.rows[0];
  }

  /**
   * Create opening balance lines.
   *
   * This method expects the caller to already have a transaction.
   */
  static async create(
    client: PoolClient,
    companyId: string,
    partyType: OpeningBalancePartyType,
    rawPayload: unknown,
  ): Promise<OpeningBalanceRow[]> {
    const payload = this.validatePayload(rawPayload);

    const tableName = this.getTableName(partyType);

    const createdRows: OpeningBalanceRow[] = [];

    for (const rawLine of payload.lines) {
      const line = this.normalizeInput(rawLine);

      const party = await this.validateParty(
        client,
        companyId,
        partyType,
        line.party_id,
      );

      const partyCode = line.party_code || party.code || null;

      const partyName = line.party_name || party.name;

      const currencyId = line.currency_id || party.currency_id || null;

      /*
       * LCY amount:
       *
       * (Debit - Credit) * Exchange Rate
       */
      const amountLcy =
        (Number(line.debit || 0) - Number(line.credit || 0)) *
        Number(line.exchange_rate || 1);

      const result = await client.query<OpeningBalanceDbRow>(
        `
          INSERT INTO ${tableName} (
            company_id,

            party_id,
            party_code,
            party_name,

            posting_date,

            doc_type,
            doc_no,
            external_ref_no,

            description,

            currency_id,
            currency_code,

            debit,
            credit,

            exchange_rate,
            amount_lcy,

            created_at,
            updated_at
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
            $14,
            $15,
            NOW(),
            NOW()
          )
          RETURNING *
        `,
        [
          companyId,

          line.party_id,
          partyCode,
          partyName,

          line.posting_date,

          line.doc_type,
          line.doc_no || "",
          line.external_ref_no || "",

          line.description || "",

          currencyId,
          line.currency_code,

          line.debit || 0,
          line.credit || 0,

          line.exchange_rate || 1,
          amountLcy,
        ],
      );

      createdRows.push(this.mapRow(result.rows[0]));
    }

    return createdRows;
  }

  /**
   * Fetch all opening balance records for a company.
   *
   * Optional partyId can filter by customer/supplier.
   */
  static async list(
    companyId: string,
    partyType: OpeningBalancePartyType,
    partyId?: string,
  ): Promise<OpeningBalanceRow[]> {
    const tableName = this.getTableName(partyType);

    const values: string[] = [companyId];

    let whereSql = `
      WHERE company_id = $1
    `;

    if (partyId) {
      values.push(partyId);

      whereSql += `
        AND party_id = $${values.length}
      `;
    }

    const result = await pool.query<OpeningBalanceDbRow>(
      `
          SELECT
            id,
            company_id,

            party_id,
            party_code,
            party_name,

            posting_date,

            doc_type,
            doc_no,
            external_ref_no,

            description,

            currency_id,
            currency_code,

            debit,
            credit,

            exchange_rate,
            amount_lcy,

            created_at,
            updated_at

          FROM ${tableName}

          ${whereSql}

          ORDER BY
            posting_date ASC,
            created_at ASC
        `,
      values,
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  /**
   * Fetch one opening balance record.
   */
  static async get(
    companyId: string,
    partyType: OpeningBalancePartyType,
    id: string,
  ): Promise<OpeningBalanceRow | null> {
    const tableName = this.getTableName(partyType);

    const result = await pool.query<OpeningBalanceDbRow>(
      `
          SELECT
            id,
            company_id,

            party_id,
            party_code,
            party_name,

            posting_date,

            doc_type,
            doc_no,
            external_ref_no,

            description,

            currency_id,
            currency_code,

            debit,
            credit,

            exchange_rate,
            amount_lcy,

            created_at,
            updated_at

          FROM ${tableName}

          WHERE id = $1
            AND company_id = $2

          LIMIT 1
        `,
      [id, companyId],
    );

    if (!result.rows.length) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }
}
