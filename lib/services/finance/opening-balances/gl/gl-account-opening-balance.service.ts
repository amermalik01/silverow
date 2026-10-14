// lib/services/finance/opening-balances/gl/gl-account-opening-balance.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { GLPostingService, GLJournalSource } from "@/lib/services/gl/gl-posting.service";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";

export interface GLAccountOpeningBalanceInput {
  id?: string;
  posting_date: string;
  document_no?: string | null;
  external_ref_no?: string | null;
  gl_account_id: string;
  gl_account_no: string;
  gl_account_name: string;
  currency_code?: string;
  debit: number;
  credit: number;
  exchange_rate: number;
}

export interface GLAccountOpeningBalancePayload {
  lines: GLAccountOpeningBalanceInput[];
}

type DbRow = Record<string, unknown>;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nullableString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim() || null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function nullableDate(value: unknown, field: string): string | null {
  const date = nullableString(value);

  if (!date) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${field} must be a valid date.`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${field} must be a valid date.`);
  }

  return date;
}

function validateInput(input: GLAccountOpeningBalanceInput, index: number): void {
  const row = index + 1;

  if (input.id && !UUID_REGEX.test(input.id)) {
    throw new Error(`Invalid opening balance ID on row ${row}.`);
  }

  if (!UUID_REGEX.test(input.gl_account_id)) {
    throw new Error(`Invalid G/L account ID on row ${row}.`);
  }

  nullableDate(input.posting_date, `Posting date on row ${row}`);

  if (!Number.isFinite(input.debit) || input.debit < 0) {
    throw new Error(`Debit cannot be negative on row ${row}.`);
  }

  if (!Number.isFinite(input.credit) || input.credit < 0) {
    throw new Error(`Credit cannot be negative on row ${row}.`);
  }

  if (input.debit > 0 && input.credit > 0) {
    throw new Error(`Enter either debit or credit, not both, on row ${row}.`);
  }

  if (input.debit === 0 && input.credit === 0) {
    throw new Error(`Enter a debit or credit amount on row ${row}.`);
  }

  if (!Number.isFinite(input.exchange_rate) || input.exchange_rate <= 0) {
    throw new Error(`Exchange rate must be greater than zero on row ${row}.`);
  }

  if (
    input.debit > 1e14 ||
    input.credit > 1e14 ||
    input.exchange_rate > 1e10
  ) {
    throw new Error(`Numeric value exceeds the allowed range on row ${row}.`);
  }

  requiredString(input.posting_date, `Posting date on row ${row}`);
  requiredString(input.gl_account_no, `G/L account number on row ${row}`);
  requiredString(input.gl_account_name, `G/L account name on row ${row}`);
}

export class GLAccountOpeningBalanceService {
  /**
   * LIST
   */
  static async list(companyId: string) {
    const result = await pool.query(
      `
      SELECT
        id,
        posting_date,
        document_no,
        external_ref_no,
        gl_account_id,
        gl_account_no,
        gl_account_name,
        currency_code,
        debit,
        credit,
        exchange_rate,
        amount_lcy,
        status,
        posted_at,
        posted_by,
        gl_ledger_entry_id,
        journal_id,
        general_ledger_document_no,
        created_at,
        updated_at
      FROM gl_account_opening_balances
      WHERE company_id = $1
      ORDER BY posting_date, created_at, id
      `,
      [companyId],
    );

    return {
      data: result.rows.map((row: DbRow) => ({
        ...row,
        debit: Number(row.debit),
        credit: Number(row.credit),
        exchange_rate: Number(row.exchange_rate),
        amount_lcy: row.amount_lcy !== null ? Number(row.amount_lcy) : null,
        posted: row.status === "Posted",
      })),
    };
  }

  /**
   * SAVE
   */
  static async save(companyId: string, payload: GLAccountOpeningBalancePayload) {
    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      throw new Error("Please provide at least one opening balance line.");
    }

    if (payload.lines.length > 500) {
      throw new Error("You can save a maximum of 500 lines at a time.");
    }

    const accountIds = new Set<string>();
    const recordIds = new Set<string>();

    payload.lines.forEach((line, index) => {
      validateInput(line, index);

      if (accountIds.has(line.gl_account_id)) {
        throw new Error(
          `Duplicate G/L account found on row ${index + 1}. Combine balances or remove duplicates.`,
        );
      }
      accountIds.add(line.gl_account_id);

      if (line.id) {
        if (recordIds.has(line.id)) {
          throw new Error("Duplicate opening balance ID in request.");
        }
        recordIds.add(line.id);
      }
    });

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const savedRows: DbRow[] = [];

      for (const [index, line] of payload.lines.entries()) {
        const postingDate = nullableDate(
          line.posting_date,
          `Posting date on row ${index + 1}`,
        );

        const values = [
          postingDate,
          nullableString(line.document_no),
          nullableString(line.external_ref_no),
          line.gl_account_id,
          line.gl_account_no.trim(),
          line.gl_account_name.trim(),
          nullableString(line.currency_code) || "GBP",
          line.debit,
          line.credit,
          line.exchange_rate,
        ];

        if (line.id) {
          const updated = await client.query(
            `
            UPDATE gl_account_opening_balances
            SET
              posting_date = $1,
              document_no = $2,
              external_ref_no = $3,
              gl_account_id = $4,
              gl_account_no = $5,
              gl_account_name = $6,
              currency_code = $7,
              debit = $8,
              credit = $9,
              exchange_rate = $10,
              updated_at = NOW()
            WHERE id = $11
              AND company_id = $12
              AND status = 'Open'
            RETURNING *
            `,
            [...values, line.id, companyId],
          );

          if (!updated.rowCount) {
            const exists = await client.query(
              `
              SELECT status
              FROM gl_account_opening_balances
              WHERE id = $1 AND company_id = $2
              `,
              [line.id, companyId],
            );

            if (!exists.rowCount) {
              throw new Error("Opening balance not found.");
            }

            throw new Error("Posted opening balances cannot be modified.");
          }

          savedRows.push(updated.rows[0]);
        } else {
          const inserted = await client.query(
            `
            INSERT INTO gl_account_opening_balances (
              company_id,
              posting_date,
              document_no,
              external_ref_no,
              gl_account_id,
              gl_account_no,
              gl_account_name,
              currency_code,
              debit,
              credit,
              exchange_rate,
              status
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Open'
            )
            RETURNING *
            `,
            [companyId, ...values],
          );

          savedRows.push(inserted.rows[0]);
        }
      }

      await client.query("COMMIT");

      return {
        message: "GL opening balances saved successfully.",
        data: savedRows,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * DELETE DRAFT
   */
  static async delete(companyId: string, id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) {
      throw new Error("Invalid opening balance ID.");
    }

    const result = await pool.query(
      `
      DELETE FROM gl_account_opening_balances
      WHERE id = $1
        AND company_id = $2
        AND status = 'Open'
      RETURNING id
      `,
      [id, companyId],
    );

    if (!result.rowCount) {
      const existing = await pool.query(
        `
        SELECT status
        FROM gl_account_opening_balances
        WHERE id = $1 AND company_id = $2
        `,
        [id, companyId],
      );

      if (!existing.rowCount) {
        throw new Error("Opening balance not found.");
      }

      throw new Error(
        "Posted opening balances cannot be deleted. Use the reversal process.",
      );
    }
  }

  /**
   * POST
   */
  static async post(companyId: string, ids: string[], userId?: string) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("No GL opening balance lines specified for posting.");
    }

    if (ids.length > 500) {
      throw new Error("You can post a maximum of 500 GL opening balance lines at a time.");
    }

    if (ids.some((id) => typeof id !== "string" || !UUID_REGEX.test(id))) {
      throw new Error("One or more opening balance IDs are invalid.");
    }

    if (new Set(ids).size !== ids.length) {
      throw new Error("Duplicate opening balance IDs are not allowed.");
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const rowsResult = await client.query(
        `
        SELECT
          id,
          company_id,
          posting_date,
          document_no,
          external_ref_no,
          gl_account_id,
          gl_account_no,
          gl_account_name,
          currency_code,
          debit,
          credit,
          exchange_rate,
          amount_lcy,
          status
        FROM gl_account_opening_balances
        WHERE company_id = $1
          AND id = ANY($2::uuid[])
        ORDER BY posting_date, created_at, id
        FOR UPDATE
        `,
        [companyId, ids],
      );

      if (rowsResult.rowCount !== ids.length) {
        throw new Error("One or more opening balance records were not found.");
      }

      const rows = rowsResult.rows;

      for (const row of rows) {
        if (row.status !== "Open") {
          throw new Error(`Opening balance for account ${row.gl_account_no} is already posted.`);
        }

        await validateLedgerPostingDate(companyId, row.posting_date);
      }

      const totalDebit = rows.reduce((sum, r) => sum + Number(r.debit), 0);
      const totalCredit = rows.reduce((sum, r) => sum + Number(r.credit), 0);

      if (Math.abs(totalDebit - totalCredit) >= 0.005) {
        throw new Error(
          `Opening balances are not balanced. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}`,
        );
      }

      const referenceNo = `GL-OB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Map rows to GLLineInput structure expected by GLPostingService
      const glLines = rows.map((r) => ({
        account_id: r.gl_account_id,
        debit: Number(r.debit),
        credit: Number(r.credit),
        description: `Opening Balance - ${r.gl_account_name}`,
      }));

      // Post using the universal GLPostingService engine
      const postedJournal = await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: rows[0].posting_date,
        source: "GENERAL" as GLJournalSource,
        journal_type: "Opening Balance",
        reference: referenceNo,
        description: "G/L Account Opening Balance Posting",
        exchange_rate: Number(rows[0].exchange_rate || 1),
        created_by: userId || null,
        lines: glLines,
      });

      // Update source opening balance records as Posted
      for (const row of rows) {
        await client.query(
          `
          UPDATE gl_account_opening_balances
          SET
            status = 'Posted',
            posted_at = NOW(),
            posted_by = $1,
            journal_id = $2,
            general_ledger_document_no = $3,
            updated_at = NOW()
          WHERE id = $4
          `,
          [
            userId || null,
            postedJournal.id,
            postedJournal.entry_no,
            row.id,
          ],
        );
      }

      await client.query("COMMIT");

      return {
        message: "GL opening balances posted successfully.",
        documentNo: postedJournal.entry_no,
        journalId: postedJournal.id,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}