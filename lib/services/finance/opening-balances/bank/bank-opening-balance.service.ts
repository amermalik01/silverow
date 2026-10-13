// lib/services/finance/opening-balances/bank/bank-opening-balance.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import {
  GLPostingService,
  PostedJournalResult,
} from "@/lib/services/gl/gl-posting.service";
import type {
  BankOpeningBalanceCreatePayload,
  BankOpeningBalanceInput,
  BankOpeningBalanceQuery,
  BankOpeningBalanceRow,
  BankOpeningBalanceStatus,
  BankOpeningBalanceWithIdInput,
} from "./bank-opening-balance.types";

type BankOpeningBalanceDbRow = {
  id: string;
  company_id: string;
  bank_account_id: string;
  bank_gl_account_id: string;
  bank_gl_code?: string | null;
  bank_gl_name?: string | null;
  party_type: string;
  party_id: string;
  party_code: string | null;
  party_name: string;
  posting_date: string | Date;
  doc_type: string;
  doc_no: string;
  external_ref_no: string | null;
  description: string | null;
  currency_id: string | null;
  currency_code: string;
  debit: string | number | null;
  credit: string | number | null;
  exchange_rate: string | number | null;
  amount_lcy: string | number | null;
  status: string;
  posted_at: string | Date | null;
  posted_by: string | null;
  gl_ledger_entry_id: string | null;
  general_ledger_document_no: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export class BankOpeningBalanceService {
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
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private static mapRow(row: BankOpeningBalanceDbRow): BankOpeningBalanceRow {
    return {
      id: row.id,
      company_id: row.company_id,
      bank_account_id: row.bank_account_id,
      bank_gl_account_id: row.bank_gl_account_id,
      bank_gl_code: row.bank_gl_code || "",
      bank_gl_name: row.bank_gl_name || "",
      party_type: row.party_type as BankOpeningBalanceRow["party_type"],
      party_id: row.party_id,
      party_code: row.party_code || null,
      party_name: row.party_name || "",
      posting_date: this.normalizeDate(row.posting_date),
      doc_type: row.doc_type as BankOpeningBalanceRow["doc_type"],
      doc_no: row.doc_no || "",
      external_ref_no: row.external_ref_no || "",
      description: row.description || "",
      currency_id: row.currency_id,
      currency_code: row.currency_code,
      debit: this.toNumber(row.debit),
      credit: this.toNumber(row.credit),
      exchange_rate: this.toNumber(row.exchange_rate) || 1,
      amount_lcy: this.toNumber(row.amount_lcy),
      status: row.status as BankOpeningBalanceStatus,
      posted_at: row.posted_at ? new Date(row.posted_at).toISOString() : null,
      posted_by: row.posted_by || null,
      gl_ledger_entry_id: row.gl_ledger_entry_id || null,
      general_ledger_document_no: row.general_ledger_document_no || null,
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

  private static normalizeInput(
    line: BankOpeningBalanceInput,
  ): BankOpeningBalanceInput {
    const debit = Number(line.debit ?? 0);
    const credit = Number(line.credit ?? 0);
    const exchangeRate = Number(line.exchange_rate ?? 1);

    // console.log('line === ',line);

    const bankAccountId = line.bank_account_id || line.bank_gl_account_id;
    const bankGlAccountId = line.bank_gl_account_id || line.bank_account_id;

    if (!bankAccountId) {
      throw new Error("Bank account is required");
    }

    if (!bankGlAccountId) {
      throw new Error("Bank G/L account is required");
    }

    if (!line.party_id) {
      throw new Error("Party is required");
    }

    if (
      !line.party_type ||
      !["customer", "supplier"].includes(line.party_type)
    ) {
      throw new Error("Invalid party type");
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

    if (debit === 0 && credit === 0) {
      throw new Error("Either debit or credit must be greater than zero");
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error("Exchange rate must be greater than zero");
    }

    const allowedDocTypes = [
      "Invoice",
      "Credit Note",
      "Debit Note",
      "Payment",
      "Refund",
    ];
    if (!line.doc_type || !allowedDocTypes.includes(line.doc_type)) {
      throw new Error("Invalid document type");
    }

    return {
      ...line,
      bank_account_id: bankAccountId,
      bank_gl_account_id: bankGlAccountId,
      party_code: line.party_code || null,
      party_name: line.party_name || "",
      doc_no: line.doc_no || "",
      external_ref_no: line.external_ref_no || "",
      description: line.description || "",
      currency_id: line.currency_id || null,
      debit,
      credit,
      exchange_rate: exchangeRate,
    };
  }

  private static validatePayload(
    rawPayload: unknown,
  ): BankOpeningBalanceCreatePayload {
    if (typeof rawPayload !== "object" || rawPayload === null) {
      throw new Error("Invalid request body");
    }

    const payload = rawPayload as Record<string, unknown>;

    if (!Array.isArray(payload.lines)) {
      throw new Error("lines must be an array");
    }

    if (payload.lines.length === 0) {
      throw new Error("At least one opening balance line is required");
    }

    const lines: BankOpeningBalanceInput[] = [];

    for (const rawLine of payload.lines) {
      if (typeof rawLine !== "object" || rawLine === null) {
        throw new Error("Invalid opening balance line");
      }

      const line = rawLine as Record<string, unknown>;

      const normalizedLine = this.normalizeInput({
        bank_account_id: String(
          line.bank_account_id ?? line.bank_gl_account_id ?? "",
        ),
        bank_gl_account_id: String(
          line.bank_gl_account_id ?? line.bank_account_id ?? "",
        ),
        party_type: line.party_type as BankOpeningBalanceInput["party_type"],
        party_id: String(line.party_id ?? ""),
        party_code: line.party_code ? String(line.party_code) : null,
        party_name: line.party_name ? String(line.party_name) : "",
        posting_date: String(line.posting_date ?? ""),
        doc_type: line.doc_type as BankOpeningBalanceInput["doc_type"],
        doc_no: line.doc_no ? String(line.doc_no) : "",
        external_ref_no: line.external_ref_no
          ? String(line.external_ref_no)
          : null,
        description: line.description ? String(line.description) : null,
        currency_id: line.currency_id ? String(line.currency_id) : null,
        currency_code: String(line.currency_code ?? ""),
        debit: Number(line.debit ?? 0),
        credit: Number(line.credit ?? 0),
        exchange_rate: Number(line.exchange_rate ?? 1),
      });

      lines.push(normalizedLine);
    }

    return { lines };
  }

  static async list(
    companyId: string,
    query: BankOpeningBalanceQuery = {},
  ): Promise<BankOpeningBalanceRow[]> {
    let queryText = `
      SELECT 
        b.*,
        coa.code AS bank_gl_code,
        coa.name AS bank_gl_name
      FROM bank_opening_balances b
      LEFT JOIN chart_of_accounts coa ON b.bank_gl_account_id = coa.id
      WHERE b.company_id = $1
    `;
    const params: unknown[] = [companyId];
    let paramIndex = 2;

    if (query.bankAccountId) {
      queryText += ` AND bank_account_id = $${paramIndex++}`;
      params.push(query.bankAccountId);
    }

    if (query.partyId) {
      queryText += ` AND party_id = $${paramIndex++}`;
      params.push(query.partyId);
    }

    if (query.partyType) {
      queryText += ` AND party_type = $${paramIndex++}`;
      params.push(query.partyType);
    }

    if (query.status) {
      queryText += ` AND status = $${paramIndex++}`;
      params.push(query.status);
    }

    queryText += ` ORDER BY posting_date DESC, created_at DESC`;

    const result = await pool.query<BankOpeningBalanceDbRow>(queryText, params);
    return result.rows.map((row) => this.mapRow(row));
  }

  static async get(
    companyId: string,
    id: string,
  ): Promise<BankOpeningBalanceRow | null> {
    const result = await pool.query<BankOpeningBalanceDbRow>(
      `
      SELECT 
        b.*,
        coa.code AS bank_gl_code,
        coa.name AS bank_gl_name
      FROM bank_opening_balances b
      LEFT JOIN chart_of_accounts coa ON b.bank_gl_account_id = coa.id
      WHERE b.company_id = $1 AND b.id = $2
      `,
      [companyId, id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async create(
    client: PoolClient,
    companyId: string,
    rawPayload: unknown,
  ): Promise<BankOpeningBalanceRow[]> {
    const payload = this.validatePayload(rawPayload);
    const processedRows: BankOpeningBalanceRow[] = [];

    const rawLines = (payload.lines as unknown) as BankOpeningBalanceWithIdInput[];

    for (const rawLine of rawLines) {
      const line = this.normalizeInput(rawLine);

      // Validate Bank account existence & activity
      const bankRes = await client.query(
        `SELECT id, is_active, is_posting FROM chart_of_accounts WHERE company_id = $1 AND id = $2`,
        [companyId, line.bank_account_id],
      );
      if (bankRes.rows.length === 0) {
        throw new Error("Bank account not found");
      }

      // Validate Party existence
      if (line.party_type === "customer") {
        const custRes = await client.query(
          `SELECT id, name, customer_code FROM parties WHERE company_id = $1 AND id = $2`,
          [companyId, line.party_id],
        );
        if (custRes.rows.length === 0) throw new Error("Customer not found");
        if (!line.party_name) line.party_name = custRes.rows[0].name;
        if (!line.party_code) line.party_code = custRes.rows[0].customer_code;
      } else {
        const suppRes = await client.query(
          `SELECT id, name, supplier_code FROM parties WHERE company_id = $1 AND id = $2`,
          [companyId, line.party_id],
        );
        if (suppRes.rows.length === 0) throw new Error("Supplier not found");
        if (!line.party_name) line.party_name = suppRes.rows[0].name;
        if (!line.party_code) line.party_code = suppRes.rows[0].supplier_code;
      }

      // Validate Currency
      if (line.currency_id) {
        const currRes = await client.query(
          `SELECT id, code FROM currencies WHERE id = $1`,
          [line.currency_id],
        );
        if (currRes.rows.length === 0) throw new Error("Currency not found");
        if (currRes.rows[0].code !== line.currency_code) {
          throw new Error("Currency ID and currency code do not match");
        }
      }

      let queryResult;

      // If an ID is provided and exists, update it. Otherwise, insert a new record.
      if (rawLine.id) {
        queryResult = await client.query<BankOpeningBalanceDbRow>(
          `
          UPDATE bank_opening_balances
          SET
            bank_account_id = $1,
            bank_gl_account_id = $2,
            party_type = $3,
            party_id = $4,
            party_code = $5,
            party_name = $6,
            posting_date = $7,
            doc_type = $8,
            doc_no = $9,
            external_ref_no = $10,
            description = $11,
            currency_id = $12,
            currency_code = $13,
            debit = $14,
            credit = $15,
            exchange_rate = $16,
            updated_at = NOW()
          WHERE id = $17 AND company_id = $18 AND status = 'Open'
          RETURNING *
          `,
          [
            line.bank_account_id,
            line.bank_gl_account_id,
            line.party_type,
            line.party_id,
            line.party_code,
            line.party_name,
            line.posting_date,
            line.doc_type,
            line.doc_no,
            line.external_ref_no,
            line.description,
            line.currency_id,
            line.currency_code,
            line.debit,
            line.credit,
            line.exchange_rate,
            rawLine.id,
            companyId,
          ],
        );
      }

      if (!queryResult || queryResult.rows.length === 0) {
        queryResult = await client.query<BankOpeningBalanceDbRow>(
          `
          INSERT INTO bank_opening_balances (
            company_id,
            bank_account_id,
            bank_gl_account_id,
            party_type,
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
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Open')
          RETURNING *
          `,
          [
            companyId,
            line.bank_account_id,
            line.bank_gl_account_id,
            line.party_type,
            line.party_id,
            line.party_code,
            line.party_name,
            line.posting_date,
            line.doc_type,
            line.doc_no,
            line.external_ref_no,
            line.description,
            line.currency_id,
            line.currency_code,
            line.debit,
            line.credit,
            line.exchange_rate,
          ],
        );
      }

      processedRows.push(this.mapRow(queryResult.rows[0]));
    }

    return processedRows;
  }

  /* static async create(
    client: PoolClient,
    companyId: string,
    rawPayload: unknown,
  ): Promise<BankOpeningBalanceRow[]> {
    const payload = this.validatePayload(rawPayload);
    const createdRows: BankOpeningBalanceRow[] = [];

    for (const line of payload.lines) {
      // Validate Bank account existence & activity
      const bankRes = await client.query(
        `SELECT id, is_active, is_posting FROM chart_of_accounts WHERE company_id = $1 AND id = $2`,
        [companyId, line.bank_account_id],
      );
      if (bankRes.rows.length === 0) {
        throw new Error("Bank account not found");
      }

      // Validate Party existence
      if (line.party_type === "customer") {
        const custRes = await client.query(
          `SELECT id, name, customer_code FROM parties WHERE company_id = $1 AND id = $2`,
          [companyId, line.party_id],
        );
        if (custRes.rows.length === 0) throw new Error("Customer not found");
        if (!line.party_name) line.party_name = custRes.rows[0].name;
        if (!line.party_code) line.party_code = custRes.rows[0].customer_code;
      } else {
        const suppRes = await client.query(
          `SELECT id, name, supplier_code FROM parties WHERE company_id = $1 AND id = $2`,
          [companyId, line.party_id],
        );
        if (suppRes.rows.length === 0) throw new Error("Supplier not found");
        if (!line.party_name) line.party_name = suppRes.rows[0].name;
        if (!line.party_code) line.party_code = suppRes.rows[0].supplier_code;
      }

      // Validate Currency
      if (line.currency_id) {
        const currRes = await client.query(
          `SELECT id, code FROM currencies WHERE id = $1`,
          [line.currency_id],
        );
        if (currRes.rows.length === 0) throw new Error("Currency not found");
        if (currRes.rows[0].code !== line.currency_code) {
          throw new Error("Currency ID and currency code do not match");
        }
      }

      const insertRes = await client.query<BankOpeningBalanceDbRow>(
        `
        INSERT INTO bank_opening_balances (
          company_id,
          bank_account_id,
          bank_gl_account_id,
          party_type,
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
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'Open')
        RETURNING *
        `,
        [
          companyId,
          line.bank_account_id,
          line.bank_gl_account_id,
          line.party_type,
          line.party_id,
          line.party_code,
          line.party_name,
          line.posting_date,
          line.doc_type,
          line.doc_no,
          line.external_ref_no,
          line.description,
          line.currency_id,
          line.currency_code,
          line.debit,
          line.credit,
          line.exchange_rate,
        ],
      );

      createdRows.push(this.mapRow(insertRes.rows[0]));
    }

    return createdRows;
  } */

  static async update(
    client: PoolClient,
    companyId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<BankOpeningBalanceRow> {
    const existing = await this.get(companyId, id);
    if (!existing) {
      throw new Error("Opening balance record not found");
    }

    if (existing.status !== "Open") {
      throw new Error("Only open opening balance records can be updated");
    }

    if (typeof rawPayload !== "object" || rawPayload === null) {
      throw new Error("Invalid request body");
    }

    const payload = rawPayload as Record<string, unknown>;
    const normalized = this.normalizeInput({
      bank_account_id: String(
        payload.bank_account_id ?? existing.bank_account_id,
      ),
      bank_gl_account_id: String(
        payload.bank_gl_account_id ?? existing.bank_account_id,
      ),
      party_type:
        (payload.party_type as BankOpeningBalanceInput["party_type"]) ??
        existing.party_type,
      party_id: String(payload.party_id ?? existing.party_id),
      party_code:
        payload.party_code !== undefined
          ? payload.party_code
            ? String(payload.party_code)
            : null
          : existing.party_code,
      party_name:
        payload.party_name !== undefined
          ? String(payload.party_name)
          : existing.party_name,
      posting_date: String(payload.posting_date ?? existing.posting_date),
      doc_type:
        (payload.doc_type as BankOpeningBalanceInput["doc_type"]) ??
        existing.doc_type,
      doc_no:
        payload.doc_no !== undefined ? String(payload.doc_no) : existing.doc_no,
      external_ref_no:
        payload.external_ref_no !== undefined
          ? payload.external_ref_no
            ? String(payload.external_ref_no)
            : null
          : existing.external_ref_no,
      description:
        payload.description !== undefined
          ? payload.description
            ? String(payload.description)
            : null
          : existing.description,
      currency_id:
        payload.currency_id !== undefined
          ? payload.currency_id
            ? String(payload.currency_id)
            : null
          : existing.currency_id,
      currency_code: String(payload.currency_code ?? existing.currency_code),
      debit: Number(payload.debit ?? existing.debit),
      credit: Number(payload.credit ?? existing.credit),
      exchange_rate: Number(payload.exchange_rate ?? existing.exchange_rate),
    });

    const updateRes = await client.query<BankOpeningBalanceDbRow>(
      `
      UPDATE bank_opening_balances
      SET
        bank_account_id = $1,
        bank_gl_account_id = $2,
        party_type = $3,
        party_id = $4,
        party_code = $5,
        party_name = $6,
        posting_date = $7,
        doc_type = $8,
        doc_no = $9,
        external_ref_no = $10,
        description = $11,
        currency_id = $12,
        currency_code = $13,
        debit = $14,
        credit = $15,
        exchange_rate = $16,
        updated_at = NOW()
      WHERE id = $17 AND company_id = $18 AND status = 'Open'
      RETURNING *
      `,
      [
        normalized.bank_account_id,
        normalized.bank_gl_account_id,
        normalized.party_type,
        normalized.party_id,
        normalized.party_code,
        normalized.party_name,
        normalized.posting_date,
        normalized.doc_type,
        normalized.doc_no,
        normalized.external_ref_no,
        normalized.description,
        normalized.currency_id,
        normalized.currency_code,
        normalized.debit,
        normalized.credit,
        normalized.exchange_rate,
        id,
        companyId,
      ],
    );

    if (updateRes.rows.length === 0) {
      throw new Error("Failed to update opening balance record");
    }

    return this.mapRow(updateRes.rows[0]);
  }

  static async delete(companyId: string, id: string): Promise<void> {
    const existing = await this.get(companyId, id);
    if (!existing) {
      throw new Error("Opening balance record not found");
    }

    if (existing.status !== "Open") {
      throw new Error("Only open opening balance records can be deleted");
    }

    await pool.query(
      `DELETE FROM bank_opening_balances WHERE id = $1 AND company_id = $2 AND status = 'Open'`,
      [id, companyId],
    );
  }

  static async postWithClient(
    client: PoolClient,
    companyId: string,
    id: string,
    postedBy?: string,
  ): Promise<BankOpeningBalanceRow> {
    const existing = await this.get(companyId, id);
    if (!existing) {
      throw new Error("Opening balance record not found");
    }

    if (existing.status === "Posted") {
      throw new Error("Opening balance record has already been posted");
    }

    // Find opening balance offset account (Equity) or derive standard configuration
    // For standard ERP implementation, posting creates a GL entry debiting/crediting the bank account
    // and offsetting against the Opening Balance Equity account.
    const openingOffsetRes = await client.query(
      `SELECT id FROM chart_of_accounts WHERE company_id = $1 AND (code = '3999' OR name ILIKE '%Opening Balance Equity%') LIMIT 1`,
      [companyId],
    );

    let openingBalanceAccountId: string;
    if (openingOffsetRes.rows.length > 0) {
      openingBalanceAccountId = openingOffsetRes.rows[0].id;
    } else {
      // Fallback to any equity posting account
      const fallbackEquity = await client.query(
        `SELECT id FROM chart_of_accounts WHERE company_id = $1 AND type = 'EQUITY' AND is_posting = TRUE LIMIT 1`,
        [companyId],
      );
      if (fallbackEquity.rows.length === 0) {
        throw new Error("Opening Balance Equity G/L account is not configured");
      }
      openingBalanceAccountId = fallbackEquity.rows[0].id;
    }

    // Determine GL line amounts based on net amount (debit - credit)
    const netAmount = existing.debit - existing.credit;
    const absAmount = Math.abs(netAmount);

    const bankDebit = netAmount > 0 ? absAmount : 0;
    const bankCredit = netAmount < 0 ? absAmount : 0;
    const offsetDebit = netAmount < 0 ? absAmount : 0;
    const offsetCredit = netAmount > 0 ? absAmount : 0;

    const journal: PostedJournalResult = await GLPostingService.postJournal(
      client,
      {
        company_id: companyId,
        entry_date: existing.posting_date,
        source: "GENERAL",
        journal_type: "BANK_OPENING_BALANCE",
        reference: existing.doc_no || `BANK-OB-${existing.id}`,
        source_id: existing.id,
        description:
          existing.description ||
          `Bank opening balance for ${existing.party_name}`,
        currency_id: existing.currency_id,
        exchange_rate: existing.exchange_rate,
        created_by: postedBy || null,
        lines: [
          {
            account_id: existing.bank_account_id,
            description: `Bank Opening: ${existing.party_name}`,
            debit: bankDebit,
            credit: bankCredit,
          },
          {
            account_id: openingBalanceAccountId,
            description: `Opening Balance Offset: ${existing.party_name}`,
            debit: offsetDebit,
            credit: offsetCredit,
          },
        ],
      },
    );

    const updateRes = await client.query<BankOpeningBalanceDbRow>(
      `
      UPDATE bank_opening_balances
      SET
        status = 'Posted',
        posted_at = NOW(),
        posted_by = $1,
        gl_ledger_entry_id = $2,
        general_ledger_document_no = $3,
        updated_at = NOW()
      WHERE id = $4 AND company_id = $5
      RETURNING *
      `,
      [postedBy || null, journal.id, journal.entry_no, id, companyId],
    );

    return this.mapRow(updateRes.rows[0]);
  }
}

/* import { PoolClient } from "pg";
import {
  GLPostingService,
  PostedJournalResult,
} from "@/lib/services/gl/gl-posting.service";

export interface BankOpeningBalanceInput {
  company_id: string;

  // Bank account's G/L account in the chart of accounts
  bank_gl_account_id: string;

  // Opening Balance Equity / opening-balance offset G/L account
  opening_balance_account_id: string;

  // Positive = bank asset balance
  // Negative = bank overdraft
  opening_balance: number;

  entry_date: string;

  currency_id?: string | null;
  exchange_rate?: number;

  reference?: string | null;
  description?: string | null;

  // Optional bank master-record ID for traceability
  bank_account_id?: string | null;

  created_by?: string | null;
}

export interface BankOpeningBalanceResult {
  journal_id: string;
  entry_no: string;
  bank_gl_account_id: string;
  opening_balance_account_id: string;
  opening_balance: number;
  currency_id: string | null;
  exchange_rate: number;
}

export class BankOpeningBalanceService {

  static async create(
    client: PoolClient,
    input: BankOpeningBalanceInput,
  ): Promise<BankOpeningBalanceResult> {
    const {
      company_id,
      bank_gl_account_id,
      opening_balance_account_id,
      entry_date,
      currency_id = null,
      reference = null,
      description = "Bank opening balance",
      bank_account_id = null,
      created_by = null,
    } = input;

    const openingBalance = Number(input.opening_balance);
    const exchangeRate = Number(input.exchange_rate ?? 1);

    // --------------------------------------------------
    // 1. Validate required fields and monetary values
    // --------------------------------------------------

    if (!company_id) {
      throw new Error("Company ID is required.");
    }

    if (!bank_gl_account_id || !opening_balance_account_id) {
      throw new Error(
        "Bank G/L account and opening-balance G/L account are required.",
      );
    }

    if (bank_gl_account_id === opening_balance_account_id) {
      throw new Error(
        "Bank G/L account and opening-balance account cannot be the same.",
      );
    }

    if (!Number.isFinite(openingBalance)) {
      throw new Error("Opening balance must be a valid number.");
    }

    if (Math.abs(openingBalance) < 0.005) {
      throw new Error(
        "Opening balance must be greater than zero in absolute value.",
      );
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error("Exchange rate must be a positive number.");
    }

    if (
      !/^\\d{4}-\\d{2}-\\d{2}$/.test(entry_date) ||
      Number.isNaN(Date.parse(`${entry_date}T00:00:00Z`)) ||
      new Date(`${entry_date}T00:00:00Z`).toISOString().slice(0, 10) !==
        entry_date
    ) {
      throw new Error("Entry date must be a valid YYYY-MM-DD date.");
    }

    const roundedBalance = Number(openingBalance.toFixed(2));

    if (roundedBalance === 0) {
      throw new Error("Opening balance rounds to zero at two decimal places.");
    }

    // --------------------------------------------------
    // 2. Lock and validate both G/L accounts
    // --------------------------------------------------

    const accountIds = [bank_gl_account_id, opening_balance_account_id];

    const accountResult = await client.query(
      `
      SELECT id, is_active, is_posting
      FROM chart_of_accounts
      WHERE company_id = $1
        AND id = ANY($2::uuid[])
      ORDER BY id
      FOR UPDATE
      `,
      [company_id, accountIds],
    );

    if (accountResult.rows.length !== 2) {
      throw new Error(
        "Bank or opening-balance G/L account was not found for this company.",
      );
    }

    const accountById = new Map(
      accountResult.rows.map((account) => [account.id, account]),
    );

    for (const accountId of accountIds) {
      const account = accountById.get(accountId);

      if (!account) {
        throw new Error(`G/L account ${accountId} was not found.`);
      }

      if (!account.is_active) {
        throw new Error(`G/L account ${accountId} is inactive.`);
      }

      if (!account.is_posting) {
        throw new Error(
          `G/L account ${accountId} is not configured as a posting account.`,
        );
      }
    }

    // --------------------------------------------------
    // 3. Prevent duplicate opening-balance postings
    // --------------------------------------------------
    //
    // The caller should use a stable bank_account_id.
    // If none is supplied, use the bank G/L account ID.
    //
    // This check is useful but is not, by itself, a
    // concurrency-safe idempotency guarantee. For that,
    // add a unique database constraint or idempotency key.

    const sourceId = bank_account_id || bank_gl_account_id;

    const duplicateResult = await client.query(
      `
      SELECT id, entry_no
      FROM journal_entries
      WHERE company_id = $1
        AND source = 'GENERAL'
        AND journal_type = 'BANK_OPENING_BALANCE'
        AND source_id = $2
      LIMIT 1
      `,
      [company_id, sourceId],
    );

    if (duplicateResult.rows.length > 0) {
      throw new Error(
        `A bank opening balance has already been posted for this bank account (journal ${duplicateResult.rows[0].entry_no}).`,
      );
    }

    // --------------------------------------------------
    // 4. Determine debit and credit accounts
    // --------------------------------------------------

    const amount = Math.abs(roundedBalance);

    const bankDebit = roundedBalance > 0 ? amount : 0;
    const bankCredit = roundedBalance < 0 ? amount : 0;

    const openingDebit = roundedBalance < 0 ? amount : 0;
    const openingCredit = roundedBalance > 0 ? amount : 0;

    // --------------------------------------------------
    // 5. Post the opening-balance journal
    // --------------------------------------------------

    const journal: PostedJournalResult = await GLPostingService.postJournal(
      client,
      {
        company_id,
        entry_date,
        source: "GENERAL",
        journal_type: "BANK_OPENING_BALANCE",
        reference: reference || `BANK-OPENING-${sourceId}`,
        source_id: sourceId,
        description,
        currency_id,
        exchange_rate: exchangeRate,
        created_by,
        lines: [
          {
            account_id: bank_gl_account_id,
            description: "Bank opening balance",
            debit: bankDebit,
            credit: bankCredit,
          },
          {
            account_id: opening_balance_account_id,
            description: "Opening balance offset",
            debit: openingDebit,
            credit: openingCredit,
          },
        ],
      },
    );

    // --------------------------------------------------
    // 6. Return the posted journal details
    // --------------------------------------------------

    return {
      journal_id: journal.id,
      entry_no: journal.entry_no,
      bank_gl_account_id,
      opening_balance_account_id,
      opening_balance: roundedBalance,
      currency_id,
      exchange_rate: exchangeRate,
    };
  }
} */
