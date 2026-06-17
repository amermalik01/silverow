// lib/services/journal.service.ts
import { PoolClient } from "pg";

import { pool } from "@/lib/db";
import {
  JournalEntry,
  JournalLineInput,
  JournalPayload2,
} from "@/types/journal";

export class JournalService {

  static async list(
    companyId: string,
    filters: {
      status?: "posted" | "unposted";
      source: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Use dbSource instead of filters.source for the query bindings array
    const values: (string | number)[] = [companyId, filters.source];
    let whereConditions = `WHERE j.company_id = $1 AND j.source = $2`;

    if (filters.status === "posted") {
      whereConditions += ` AND j.is_posted = true`;
    } else if (filters.status === "unposted") {
      whereConditions += ` AND j.is_posted = false`;
    }

    // Get total count for pagination controls
    const countQuery = `SELECT COUNT(*)::int AS total FROM journal_entries j ${whereConditions}`;
    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    // Append limits to parameters array safely
    values.push(limit, offset);

    const dataQuery = `
    SELECT 
      j.id,
      j.entry_no,
      j.entry_date,
      j.reference,
      j.description,
      j.is_posted,
      COALESCE((
        SELECT SUM(debit * COALESCE(exchange_rate, 1.0)) 
        FROM journal_entry_lines 
        WHERE journal_id = j.id
      ), 0) as amount
    FROM journal_entries j
    ${whereConditions}
    ORDER BY j.entry_no DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `;

    const result = await pool.query(dataQuery, values);

    return {
      rows: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async get(companyId: string, id: string) {
    const journalResult = await pool.query(
      `
      SELECT *
      FROM journal_entries
      WHERE id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    if (!journalResult.rows.length) return null;

    const linesResult = await pool.query(
      `
      SELECT *
      FROM journal_entry_lines
      WHERE journal_id = $1
      ORDER BY created_at ASC
      `,
      [id],
    );

    return {
      journal: journalResult.rows[0],
      lines: linesResult.rows,
    };
  }

  /**
   * Helper to map internal types to your exact ref_modules names
   */
  private static getModuleKey(source: string): string {
    const clean = source.toUpperCase();
    if (clean === "GENERAL" || clean === "GL_JOURNAL") return "gl_journal";
    if (clean === "SALES" || clean === "CUSTOMER_JOURNAL")
      return "customer_journal";
    if (clean === "PURCHASE" || clean === "SUPPLIER_JOURNAL")
      return "supplier_journal";
    if (clean === "INVENTORY" || clean === "ITEM_JOURNAL")
      return "item_journal";
    return "gl_journal";
  }

  /**
   * Helper to get the lowercase journal_type enum expected by the DB
   */
  private static getJournalType(
    source: string,
  ): "customer" | "supplier" | "item" | "general" {
    const clean = source.toUpperCase();
    if (clean === "SALES" || clean === "CUSTOMER_JOURNAL") return "customer";
    if (clean === "PURCHASE" || clean === "SUPPLIER_JOURNAL") return "supplier";
    if (clean === "INVENTORY" || clean === "ITEM_JOURNAL") return "item";
    return "general"; // Default fallback for GENERAL / GL_JOURNAL
  }

  /**
   * CREATE
   */
  static async create(
    companyId: string,
    payload: JournalPayload2,
  ): Promise<JournalEntry> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      this.validateLines(payload.lines);

      // 1. Get sequence module key
      const moduleKey = this.getModuleKey(payload.source);

      // 2. Fetch the formatted sequence string
      const seqResult = await client.query(
        `SELECT public.get_next_sequence($1, $2) AS sequence_code`,
        [companyId, moduleKey],
      );
      const sequenceCode = seqResult.rows[0].sequence_code;

      // 3. Extract purely digits for integer entry_no configuration
      const entryNo = parseInt(sequenceCode.replace(/\D/g, ""), 10) || 1;

      // 4. Resolve the lowercase journal type string ("general", "customer", etc.)
      const journalType = this.getJournalType(payload.source);

      // 5. ✅ FIXED: Added journal_type column and values parameter map pointer
      const journalResult = await client.query(
        `
      INSERT INTO journal_entries (
        company_id,
        entry_no,
        entry_date,
        source,
        journal_type,
        reference,
        description,
        is_posted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      RETURNING *
      `,
        [
          companyId,
          entryNo,
          payload.entry_date,
          payload.source,
          journalType, // Added here
          payload.reference || sequenceCode,
          payload.description || null,
        ],
      );

      const journal = journalResult.rows[0];

      for (const line of payload.lines) {
        await this.insertLine(client, companyId, journal.id, line);
      }

      await client.query("COMMIT");

      return journal;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * UPDATE
   */
  static async update(
    companyId: string,
    id: string,
    // payload: JournalPayload,
    payload: JournalPayload2,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      this.validateLines(payload.lines);

      const existing = await client.query(
        `
        SELECT is_posted
        FROM journal_entries
        WHERE id = $1
        AND company_id = $2
        `,
        [id, companyId],
      );

      if (!existing.rows.length) {
        throw new Error("Journal not found");
      }

      if (existing.rows[0].is_posted) {
        throw new Error("Posted journal cannot be modified");
      }

      await client.query(
        `
        UPDATE journal_entries
        SET
          entry_date = $1,
          source = $2,
          reference = $3,
          description = $4,
          updated_at = now()
        WHERE id = $5
        `,
        [
          payload.entry_date,
          payload.source,
          payload.reference || null,
          payload.description || null,
          id,
        ],
      );

      await client.query(
        `
        DELETE FROM journal_entry_lines
        WHERE journal_id = $1
        `,
        [id],
      );

      for (const line of payload.lines) {
        await this.insertLine(client, companyId, id, line);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");

      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * POST
   */
  static async post(companyId: string, id: string): Promise<void> {
    await pool.query(
      `
      UPDATE journal_entries
      SET
        is_posted = true,
        posted_at = now()
      WHERE id = $1
      AND company_id = $2
      AND is_posted = false
      `,
      [id, companyId],
    );
  }

  /**
   * DELETE
   */
  static async delete(companyId: string, id: string): Promise<void> {
    const result = await pool.query(
      `
      DELETE FROM journal_entries
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );

    if (!result.rowCount) {
      throw new Error("Journal not found");
    }
  }

  /**
   * INSERT LINE
   */
  /**
   * INSERT LINE
   */
  private static async insertLine(
    client: PoolClient,
    companyId: string,
    journalId: string,
    line: JournalLineInput,
  ) {
    let resolvedAccountId = line.account_id?.trim() || null;
    const transType = line.transaction_type || "gl_no"; // Incoming UI tracking field

    // Map your UI structural names to your exact database ENUM values ('customer', 'supplier')
    // If it's a standard gl_no line, we leave the party_type blank (null)
    const dbPartyType = transType === "customer" || transType === "supplier" ? transType : null;

    // If the frontend didn't pass an account_id, look it up via the sub-ledger relationship
    if (!resolvedAccountId && line.party_id) {
      resolvedAccountId = await this.getControlAccountForParty(
        client, 
        companyId, 
        line.party_id, 
        dbPartyType || "customer" // Falls back to looking up customer tables if unclear
      );
      
      if (!resolvedAccountId) {
         throw new Error(
           `A valid G/L control account configuration could not be found for Sub-Ledger Party: ${line.party_id}`
         );
      }
    }

    await client.query(
      `
      INSERT INTO journal_entry_lines (
        company_id,
        journal_id,
        party_type,       -- ✅ FIXED: Matches your exact ALTER TABLE name
        account_id,
        debit,
        credit,
        description,
        party_id,
        item_id,
        currency_id,
        exchange_rate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        companyId,
        journalId,
        dbPartyType,                  // Parameter $3 -> Maps cleanly into your sub_ledger_type enum
        resolvedAccountId,            // Parameter $4
        line.debit ?? 0,              // Parameter $5
        line.credit ?? 0,             // Parameter $6
        line.description || null,     // Parameter $7
        line.party_id?.trim() || null,// Parameter $8
        line.item_id?.trim() || null, // Parameter $9
        line.currency_id?.trim() || null, // Parameter $10
        line.currency_id?.trim() ? (line.exchange_rate ?? 1.0) : 1.0, // Parameter $11
      ],
    );
  }

  /**
   * Helper to fetch the control account from customer/supplier tables
   */
  private static async getControlAccountForParty(
    client: PoolClient,
    companyId: string,
    partyId: string,
    type: "customer" | "supplier"
  ): Promise<string | null> {
    // If it's a customer, find their Receivables Control Account setup
    if (type === "customer") {
      const res = await client.query(
        `SELECT receivable_account_id FROM customers WHERE id = $1 AND company_id = $2`,
        [partyId, companyId]
      );
      return res.rows[0]?.receivable_account_id || null;
    }

    // If it's a supplier/vendor, find their Payables Control Account setup
    if (type === "supplier") {
      const res = await client.query(
        `SELECT payable_account_id FROM suppliers WHERE id = $1 AND company_id = $2`,
        [partyId, companyId]
      );
      return res.rows[0]?.payable_account_id || null;
    }

    return null;
  }
  /* private static async insertLine(
    client: PoolClient,
    companyId: string,
    journalId: string,
    // line: JournalLine,
    line: JournalLineInput,
  ) {
    await client.query(
      `
      INSERT INTO journal_entry_lines (
        company_id,
        journal_id,
        account_id,
        debit,
        credit,
        description,
        party_id,
        item_id,
        currency_id,
        exchange_rate
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $9, $10)
      `,
      [
        companyId,
        journalId,
        line.account_id,
        line.debit ?? 0,
        line.credit ?? 0,
        line.description || null,
        line.party_id || null,
        line.item_id || null,
        line.currency_id || null,
        line.currency_id ? (line.exchange_rate ?? 1.0) : 1.0,
      ],
    );
  } */

  /**
   * VALIDATE
   */

  private static validateLines(lines: JournalLineInput[]) {
    if (!lines || lines.length === 0) {
      throw new Error("Journal requires at least one line");
    }

    let totalDebitConverted = 0;
    let totalCreditConverted = 0;

    for (const line of lines) {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      const rate = Number(line.exchange_rate || 1.0);

      if (debit > 0 && credit > 0) {
        throw new Error("Line cannot have both debit and credit");
      }

      // Fix: Round each converted leg to 2 decimal points to avoid micro-fraction stack ups
      totalDebitConverted += Number((debit * rate).toFixed(2));
      totalCreditConverted += Number((credit * rate).toFixed(2));
    }

    // Fix: Match variance constraint validation threshold to two decimal precision (0.01)
    const variance = Math.abs(totalDebitConverted - totalCreditConverted);

    if (variance >= 0.01) {
      throw new Error(
        `Journal is not balanced in base currency. Difference: ${variance.toFixed(2)}`,
      );
    }
  }

  /* private static validateLines(lines: JournalLineInput[]) {
    if (!lines || lines.length === 0) {
      throw new Error("Journal requires at least one line");
    }

    let totalDebitConverted = 0;
    let totalCreditConverted = 0;

    for (const line of lines) {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);

      // Fall back to a multiplier of 1.0 if exchange_rate is missing or null
      const rate = Number(line.exchange_rate || 1.0);

      if (debit > 0 && credit > 0) {
        throw new Error("Line cannot have both debit and credit");
      }

      // Accumulate the normalized amounts converted to your base currency
      totalDebitConverted += debit * rate;
      totalCreditConverted += credit * rate;
    }

    // Use a variance threshold buffer to prevent strict floating point fraction blocks
    const variance = Math.abs(totalDebitConverted - totalCreditConverted);

    if (variance >= 0.001) {
      throw new Error(
        `Journal is not balanced in base currency. Difference: ${variance.toFixed(2)}`,
      );
    }
  } */

  /**
   * =========================================================
   * CREATE WITH EXISTING CLIENT
   * =========================================================
   */

  /**
   * CREATE WITH EXISTING CLIENT
   */
  static async createWithClient(
    companyId: string,
    payload: JournalPayload2,
  ): Promise<JournalEntry> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      this.validateLines(payload.lines);

      const moduleKey = this.getModuleKey(payload.source);

      const seqResult = await client.query(
        `SELECT public.get_next_sequence($1, $2) AS sequence_code`,
        [companyId, moduleKey],
      );
      const sequenceCode = seqResult.rows[0].sequence_code;

      const entryNo = parseInt(sequenceCode.replace(/\D/g, ""), 10) || 1;
      const journalType = this.getJournalType(payload.source);

      // 5. ✅ FIXED: Added journal_type column and values parameter map pointer here too
      const journalResult = await client.query(
        `
      INSERT INTO journal_entries (
        company_id,
        entry_no,
        entry_date,
        source,
        journal_type,
        reference,
        description,
        is_posted,
        posted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, now())
      RETURNING *
      `,
        [
          companyId,
          entryNo,
          payload.entry_date,
          payload.source,
          journalType, // Added here
          payload.reference || sequenceCode,
          payload.description || null,
        ],
      );

      const journal = journalResult.rows[0];

      for (const line of payload.lines) {
        await this.insertLine(client, companyId, journal.id, line);
      }

      await client.query("COMMIT");
      return journal;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

