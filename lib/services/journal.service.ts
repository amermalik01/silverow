// lib/services/journal.service.ts
import { PoolClient } from "pg";

import { pool } from "@/lib/db";

import { JournalEntry, JournalLine, JournalPayload } from "@/types/journal";

export class JournalService {
  /**
   * LIST
   */

  static async list(
    companyId: string,
    filters?: {
      status?: "posted" | "unposted";
      is_posted?: boolean;
      source?: string;
    },
  ): Promise<JournalEntry[]> {
    const values: (string | boolean)[] = [companyId];

    let where = `WHERE company_id = $1`;

    // ✅ posted/unposted backward compatibility
    if (filters?.status === "posted") {
      values.push(true);
      where += ` AND is_posted = $${values.length}`;
    }

    if (filters?.status === "unposted") {
      values.push(false);
      where += ` AND is_posted = $${values.length}`;
    }

    // ✅ modern boolean filter (preferred)
    if (typeof filters?.is_posted === "boolean") {
      values.push(filters.is_posted);
      where += ` AND is_posted = $${values.length}`;
    }

    // ✅ source filter (customer/supplier/item/general)
    if (filters?.source) {
      values.push(filters.source);
      where += ` AND source = $${values.length}`;
    }

    const query = `
    SELECT *
    FROM journal_entries
    ${where}
    ORDER BY created_at DESC
  `;

    const result = await pool.query(query, values);

    return result.rows;
  }
  /* static async list(
    companyId: string,
    posted?: string,
  ): Promise<JournalEntry[]> {
    const values: (string | boolean)[] = [companyId];

    let where = `
      WHERE company_id = $1
    `;

    if (posted === "posted") {
      where += `
        AND is_posted = true
      `;
    }

    if (posted === "unposted") {
      where += `
        AND is_posted = false
      `;
    }

    const query = `
      SELECT *
      FROM journal_entries
      ${where}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, values);

    return result.rows;
  } */

  /**
   * GET ONE
   */
  static async get(
    companyId: string,
    id: string,
  ): Promise<{
    journal: JournalEntry;
    lines: JournalLine[];
  } | null> {
    const journalResult = await pool.query(
      `
      SELECT *
      FROM journal_entries
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );

    if (!journalResult.rows.length) {
      return null;
    }

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
   * CREATE
   */
  static async create(
    companyId: string,
    payload: JournalPayload,
  ): Promise<JournalEntry> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      this.validateLines(payload.lines);

      const journalResult = await client.query(
        `
        INSERT INTO journal_entries (
          company_id,
          entry_date,
          source,
          reference,
          description
        )
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *
        `,
        [
          companyId,
          payload.entry_date,
          payload.source,
          payload.reference || null,
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
    payload: JournalPayload,
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
          description = $4
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
  private static async insertLine(
    client: PoolClient,
    companyId: string,
    journalId: string,
    line: JournalLine,
  ) {
    await client.query(
      `
      INSERT INTO journal_entry_lines (
        company_id,
        journal_id,
        account_id,
        debit,
        credit,
        description
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        companyId,
        journalId,
        line.account_id,
        line.debit || 0,
        line.credit || 0,
        line.description || null,
      ],
    );
  }

  /**
   * VALIDATE
   */
  private static validateLines(lines: JournalLine[]) {
    if (!lines.length) {
      throw new Error("Journal requires at least one line");
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      totalDebit += Number(line.debit || 0);

      totalCredit += Number(line.credit || 0);

      if (Number(line.debit || 0) > 0 && Number(line.credit || 0) > 0) {
        throw new Error("Line cannot contain both debit and credit");
      }
    }

    if (totalDebit !== totalCredit) {
      throw new Error("Journal is not balanced");
    }
  }
}
