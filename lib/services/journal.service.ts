// lib/services/journal.service.ts
import { PoolClient } from "pg";

import { pool } from "@/lib/db";
import {
  JournalEntry,
  JournalLineInput,
  JournalPayload2,
} from "@/types/journal";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";

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
    SELECT 
      l.*,
      l.party_type::text AS raw_party_type,
      a.code AS account_code,
      a.name AS account_name, 
      p.name AS party_name,
      p.customer_code,
      p.supplier_code, 
      bal.code AS balancing_account_code,
      bal.name AS balancing_account_name,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'invoice_ledger_id', alloc.ledger_entry_id,
            'amount', alloc.allocated_amount,
            'allocated_amount', alloc.allocated_amount,
            'allocation_type', alloc.allocation_type
          )
        ) FILTER (WHERE alloc.id IS NOT NULL),
        '[]'
      ) AS allocations
    FROM journal_entry_lines l
    LEFT JOIN chart_of_accounts a ON l.account_id = a.id
    LEFT JOIN public.parties p ON l.party_id = p.id
    LEFT JOIN chart_of_accounts bal ON l.reference_id = bal.id AND l.reference_type = 'G/L Account'
    LEFT JOIN ledger_allocations alloc ON l.id = alloc.journal_line_id
    WHERE l.journal_id = $1
    GROUP BY l.id, a.code, a.name, p.name, p.customer_code, p.supplier_code, bal.code, bal.name
    ORDER BY l.line_no ASC, l.created_at ASC
    `,
      [id],
    );

    const formattedLines = linesResult.rows.map((row) => {
      let transactionType: "gl_no" | "customer" | "supplier" = "gl_no";

      if (row.raw_party_type === "customer" || row.customer_code) {
        transactionType = "customer";
      } else if (row.raw_party_type === "supplier" || row.supplier_code) {
        transactionType = "supplier";
      }

      return {
        ...row,
        transaction_type: transactionType,
        party_type:
          row.raw_party_type ||
          (transactionType !== "gl_no" ? transactionType : null),
        allocations: row.allocations || [],
      };
    });

    return {
      journal: journalResult.rows[0],
      lines: formattedLines,
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

  private static async getNextSequenceCode(
    client: PoolClient,
    companyId: string,
    source: string,
  ): Promise<string> {
    const moduleKey =
      source === "GENERAL"
        ? this.getModuleKey("gl_journal")
        : this.getModuleKey(source);

    const seqResult = await client.query(
      `SELECT public.get_next_sequence($1, $2) AS sequence_code`,
      [companyId, moduleKey],
    );

    return seqResult.rows[0].sequence_code;
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

      this.validateLines(payload.lines, payload.source);

      // 1. Get sequence module key
      const sequenceCode = await this.getNextSequenceCode(
        client,
        companyId,
        payload.source,
      );

      // 2. Resolve journal type
      const journalType = this.getJournalType(payload.source);

      // 3. Insert Header
      const journalResult = await client.query(
        `
        INSERT INTO journal_entries (
          company_id,
          entry_no,
          entry_date,
          source,
          journal_type,
          is_posted
        )
        VALUES ($1, $2, $3, $4, $5, false)
        RETURNING *
        `,
        [
          companyId,
          sequenceCode,
          payload.entry_date,
          payload.source,
          journalType,
          // payload.reference || sequenceCode,
          // payload.description || null,
        ],
      );

      const journal = journalResult.rows[0];

      const insertedLinesWithIds: (JournalLineInput & {
        journal_line_id: string;
      })[] = [];

      // 4. Insert lines using the shared helper function
      for (let i = 0; i < payload.lines.length; i++) {
        const insertedLine = await this.insertLine(
          client,
          companyId,
          journal.id,
          payload.lines[i],
          i + 1,
        );

        insertedLinesWithIds.push({
          ...payload.lines[i],
          journal_line_id: insertedLine.id,
        });
      }

      // 5. Insert allocations across all lines
      await this.insertAllocations(
        client,
        companyId,
        journal.id,
        payload.entry_date,
        insertedLinesWithIds,
      );

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

      this.validateLines(payload.lines, payload.source);

      const existing = await client.query(
        `
        SELECT is_posted,entry_no
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

      let sequenceCode = existing.rows[0].entry_no;

      const isOnlyNumber = /^\d+$/.test(String(sequenceCode));
      const isNumberType =
        typeof sequenceCode === "number" && Number.isInteger(sequenceCode);

      // Re-generate sequence code if the previous entry_no was purely integer fallback
      if (isOnlyNumber && isNumberType) {
        sequenceCode = await this.getNextSequenceCode(
          client,
          companyId,
          payload.source,
        );
      }

      // 1. Update master entry
      await client.query(
        `
        UPDATE journal_entries
        SET
          entry_date = $1,
          source = $2,
          updated_at = now(),
          entry_no = $3
        WHERE id = $4
        `,
        [
          payload.entry_date,
          payload.source,
          // payload.reference || null,
          // payload.description || null,
          sequenceCode || null,
          id,
        ],
      );

      // 2. Clear old allocations FIRST (Fixes Foreign Key Constraint Error)
      await client.query(
        `
        DELETE FROM ledger_allocations
        WHERE payment_entry_id = $1 AND company_id = $2
        `,
        [id, companyId],
      );

      // 3. Clear existing lines AFTER allocations are removed
      await client.query(
        `
        DELETE FROM journal_entry_lines
        WHERE journal_id = $1
        `,
        [id],
      );

      // 4. Insert new lines and collect generated IDs
      const insertedLinesWithIds: (JournalLineInput & {
        journal_line_id: string;
      })[] = [];

      for (let i = 0; i < payload.lines.length; i++) {
        const insertedLine = await this.insertLine(
          client,
          companyId,
          id,
          payload.lines[i],
          i + 1,
        );

        insertedLinesWithIds.push({
          ...payload.lines[i],
          journal_line_id: insertedLine.id,
        });
      }

      // 5. Insert fresh allocations with updated line IDs
      await this.insertAllocations(
        client,
        companyId,
        id,
        payload.entry_date,
        insertedLinesWithIds,
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");

      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * INSERT LINE
   */
  private static async insertLine(
    client: PoolClient,
    companyId: string,
    journalId: string,
    line: JournalLineInput,
    lineNo: number = 1,
  ): Promise<{ id: string }> {
    let resolvedAccountId = line.account_id?.trim() || null;

    // 1. Resolve transaction_type from incoming UI payload
    const transType =
      line.transaction_type || (line.party_type as string) || "gl_no";

    // 2. Map transaction_type to db party_type ('customer' | 'supplier' | null)
    const dbPartyType =
      transType === "customer" || transType === "supplier" ? transType : null;

    const partyId = line.party_id?.trim() || null;

    // 3. Resolve Control Account if user selected a Sub-Ledger Party (Customer/Supplier)
    if (dbPartyType && partyId) {
      resolvedAccountId = await this.getControlAccountForParty(
        client,
        companyId,
        partyId,
        dbPartyType,
      );

      if (!resolvedAccountId) {
        throw new Error(
          `A valid G/L control account configuration could not be found for ${dbPartyType} ID: ${partyId}`,
        );
      }
    }

    // 4. Fallback guard for pure G/L lines
    if (!resolvedAccountId) {
      throw new Error(`Missing G/L account for line entry`);
    }

    // Resolve structural balancing fields for persistence mapping
    const balancingAccountId = line.balancing_account_id?.trim() || null;

    // If a balancing account is present on this line, mark reference fields to match ledger query patterns
    const resolvedRefType = balancingAccountId
      ? "G/L Account"
      : line.reference_type || null;

    const resolvedRefId = balancingAccountId
      ? balancingAccountId
      : line.reference_id || null;

    const fallbackDate = new Date().toISOString().split("T")[0];
    const finalLineDate = line.posting_date || fallbackDate;

    const referenceType = line.balancing_account_id ? "G/L Account" : null;
    const referenceId = line.balancing_account_id || null;

    const result = await client.query(
      `
      INSERT INTO journal_entry_lines (
        company_id,
        journal_id,
        line_no,
        posting_date,
        document_type,
        document_no,
        account_id,
        party_id,
        party_type,
        item_id,
        warehouse_id,
        currency_id,
        exchange_rate,
        description,
        debit,
        credit,
        reference_type,
        reference_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::sub_ledger_type, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
      `,
      [
        companyId,
        journalId,
        lineNo,
        finalLineDate,
        line.document_type || null,
        line.document_no || null,
        resolvedAccountId,
        line.party_id?.trim() || null,
        dbPartyType,
        line.item_id?.trim() || null,
        line.warehouse_id?.trim() || null,
        line.currency_id?.trim() || null,
        line.currency_id?.trim() ? (line.exchange_rate ?? 1.0) : 1.0,
        line.description || null,
        line.debit ?? 0,
        line.credit ?? 0,
        referenceType,
        referenceId,
      ],
    );

    return result.rows[0];
  }

  /**
   * INSERT ALLOCATIONS HELPER
   * Iterates over lines and saves document payment allocations to the ledger_allocations table.
   */

  private static async insertAllocations(
    client: PoolClient,
    companyId: string,
    journalId: string,
    entryDate: string,
    lines: (JournalLineInput & { journal_line_id?: string })[],
  ) {
    for (const line of lines) {
      if (line.allocations && line.allocations.length > 0) {
        for (const alloc of line.allocations) {
          const targetLedgerId =
            alloc.ledger_entry_id || alloc.invoice_ledger_id;
          const allocatedAmount = alloc.allocated_amount ?? alloc.amount ?? 0;
          const allocType =
            alloc.allocation_type ||
            (line.party_type === "supplier" ? "AP" : "AR");

          await client.query(
            `
          INSERT INTO ledger_allocations (
            company_id,
            allocation_type,
            payment_entry_id,
            journal_line_id,
            ledger_entry_id,
            allocated_amount,
            exchange_rate,
            allocation_date,
            remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
            [
              companyId,
              allocType,
              journalId,
              line.journal_line_id || null, // Link allocation to the exact line
              targetLedgerId,
              allocatedAmount,
              alloc.exchange_rate || 1.0,
              entryDate,
              alloc.remarks || null,
            ],
          );
        }
      }
    }
  }

  /**
   * Helper to fetch the control account from customer/supplier tables
   * with multi-tier fallback resolution.
   */
  private static async getControlAccountForParty(
    client: PoolClient,
    companyId: string,
    partyId: string,
    type: "customer" | "supplier",
  ): Promise<string | null> {
    if (type === "customer") {
      // 1. Try resolving via sales_posting_group_id
      const res = await client.query(
        `SELECT spg.receivable_account_id 
         FROM public.parties p
         INNER JOIN public.sales_posting_groups spg ON p.sales_posting_group_id = spg.id
         WHERE p.id = $1 AND p.company_id = $2`,
        [partyId, companyId],
      );
      if (res.rows[0]?.receivable_account_id) {
        return res.rows[0].receivable_account_id;
      }

      // 2. Fallback: Check direct gl_account_receivable on party
      const directRes = await client.query(
        `SELECT gl_account_receivable 
         FROM public.parties 
         WHERE id = $1 AND company_id = $2`,
        [partyId, companyId],
      );
      const directAcc = directRes.rows[0]?.gl_account_receivable;
      if (directAcc && directAcc.trim() !== "") {
        return directAcc.trim();
      }

      // 3. Last Fallback: First active sales posting group for company
      const defaultRes = await client.query(
        `SELECT receivable_account_id 
         FROM public.sales_posting_groups 
         WHERE company_id = $1 
         ORDER BY created_at ASC LIMIT 1`,
        [companyId],
      );
      return defaultRes.rows[0]?.receivable_account_id || null;
    }

    if (type === "supplier") {
      // 1. Try resolving via purchase_posting_group_id
      const res = await client.query(
        `SELECT ppg.payable_account_id 
         FROM public.parties p
         INNER JOIN public.purchase_posting_groups ppg ON p.purchase_posting_group_id = ppg.id
         WHERE p.id = $1 AND p.company_id = $2`,
        [partyId, companyId],
      );
      if (res.rows[0]?.payable_account_id) {
        return res.rows[0].payable_account_id;
      }

      // 2. Fallback: Check direct gl_account_payable on party
      const directRes = await client.query(
        `SELECT gl_account_payable 
         FROM public.parties 
         WHERE id = $1 AND company_id = $2`,
        [partyId, companyId],
      );
      const directAcc = directRes.rows[0]?.gl_account_payable;
      if (directAcc && directAcc.trim() !== "") {
        return directAcc.trim();
      }

      // 3. Last Fallback: First active purchase posting group for company
      const defaultRes = await client.query(
        `SELECT payable_account_id 
         FROM public.purchase_posting_groups 
         WHERE company_id = $1 
         ORDER BY created_at ASC LIMIT 1`,
        [companyId],
      );
      return defaultRes.rows[0]?.payable_account_id || null;
    }

    return null;
  }
  /**
   * VALIDATE - Matches legacy balancing account bypass rules with LCY decimal precision tracking
   */
  private static validateLines(lines: JournalLineInput[], source?: string) {
    if (!lines || lines.length === 0) {
      throw new Error("Journal requires at least one line");
    }

    // Skip global balancing constraint if it's an Item Journal
    if (source === "ITEM_JOURNAL" || source === "INVENTORY") {
      // Basic structural validation per line only
      for (const line of lines) {
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        if (debit > 0 && credit > 0) {
          throw new Error("Line cannot have both debit and credit");
        }
      }
      return; // Bypass balancing checks entirely
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

      const balAcc =
        line.balancing_account_id?.trim() || line.reference_id?.trim();

      if (balAcc) {
        // Line has a balancing account selected (e.g. Bank/Cash).
        // It balances itself internally: line debit = bal credit, line credit = bal debit.
        const lineDebitLCY = Number((debit * rate).toFixed(2));
        const lineCreditLCY = Number((credit * rate).toFixed(2));

        if (lineDebitLCY > 0) {
          totalDebitConverted += lineDebitLCY;
          totalCreditConverted += lineDebitLCY; // Opposing leg automatically generated
        } else if (lineCreditLCY > 0) {
          totalCreditConverted += lineCreditLCY;
          totalDebitConverted += lineCreditLCY; // Opposing leg automatically generated
        }
      } else {
        // Standard double-entry line without inline balancing account
        if (debit > 0) {
          totalDebitConverted += Number((debit * rate).toFixed(2));
        }
        if (credit > 0) {
          totalCreditConverted += Number((credit * rate).toFixed(2));
        }
      }
    }

    // Match variance constraint validation threshold to two decimal precision (0.01)
    const variance = Math.abs(totalDebitConverted - totalCreditConverted);

    if (variance >= 0.01) {
      throw new Error(
        `Journal is not balanced in base currency. Difference: ${variance.toFixed(2)}`,
      );
    }
  }

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
      this.validateLines(payload.lines, payload.source);

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

      const insertedLinesWithIds: (JournalLineInput & {
        journal_line_id: string;
      })[] = [];

      for (let i = 0; i < payload.lines.length; i++) {
        const insertedLine = await this.insertLine(
          client,
          companyId,
          journal.id,
          payload.lines[i],
          i + 1,
        );

        insertedLinesWithIds.push({
          ...payload.lines[i],
          journal_line_id: insertedLine.id,
        });
      }

      await this.insertAllocations(
        client,
        companyId,
        journal.id,
        payload.entry_date,
        insertedLinesWithIds,
      );

      // for (const line of payload.lines) {
      //   await this.insertLine(client, companyId, journal.id, line);
      // }

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
   * POST - Validates accounting rules, expands balancing legs, and writes entries to gl_ledger_entries
   */
  static async post(companyId: string, id: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch draft header & lock row
      const journalResult = await client.query(
        `
        SELECT id, entry_no, entry_date, source, reference, description, is_posted
        FROM journal_entries
        WHERE id = $1 AND company_id = $2
        FOR UPDATE
        `,
        [id, companyId],
      );

      if (journalResult.rows.length === 0) {
        throw new Error("Journal entry not found.");
      }

      const journal = journalResult.rows[0];

      if (journal.is_posted) {
        throw new Error(
          "This journal entry has already been posted to the ledgers.",
        );
      }

      // 🛡️ VALIDATION 1: Enforce Posting Date Restrictions (Accounting Period Gatekeeper)
      const formattedDate =
        journal.entry_date instanceof Date
          ? journal.entry_date.toISOString().split("T")[0]
          : String(journal.entry_date);

      const gateCheck = await validateLedgerPostingDate(
        companyId,
        formattedDate,
      );
      if (!gateCheck.allowed) {
        throw new Error(gateCheck.reason);
      }

      // 2. Fetch draft lines
      const linesResult = await client.query(
        `
        SELECT id AS journal_line_id, account_id, party_type, party_id, document_type, description, debit, credit, exchange_rate, reference_id
        FROM journal_entry_lines
        WHERE journal_id = $1 AND company_id = $2
        `,
        [id, companyId],
      );

      if (linesResult.rows.length === 0) {
        throw new Error("Cannot post a journal entry with zero lines.");
      }

      // 3. Expand single UI lines into balanced pairs
      const expandedLegs: Array<{
        journal_line_id: string;
        account_id: string;
        party_type: string | null;
        party_id: string | null;
        document_type: string | null;
        description: string | null;
        debit: number;
        credit: number;
        is_balancing: boolean;
      }> = [];

      for (const line of linesResult.rows) {
        const rate = Number(line.exchange_rate || 1.0);
        const debitLCY = Number((Number(line.debit || 0) * rate).toFixed(2));
        const creditLCY = Number((Number(line.credit || 0) * rate).toFixed(2));

        // 🛡️ VALIDATION 2: Zero Amount Check
        if (debitLCY === 0 && creditLCY === 0) {
          throw new Error(
            "Every line entry must have a debit or credit value greater than zero.",
          );
        }

        let mainAccountId: string | null = null;

        const isSupplier =
          line.party_type === "supplier" ||
          journal.source === "SUPPLIER_JOURNAL";
        const isCustomer =
          line.party_type === "customer" ||
          journal.source === "CUSTOMER_JOURNAL";

        if (line.party_id && (isSupplier || isCustomer)) {
          if (isSupplier) {
            const partyRes = await client.query(
              `SELECT 
                  p.gl_account_payable,
                  ppg.payable_account_id AS group_account_id
                FROM parties p
                LEFT JOIN purchase_posting_groups ppg 
                  ON p.purchase_posting_group_id = ppg.id
                WHERE p.id = $1 AND p.company_id = $2`,
              [line.party_id, companyId],
            );

            const party = partyRes.rows[0];
            mainAccountId =
              party?.gl_account_payable || party?.group_account_id || null;

            if (!mainAccountId) {
              const fallbackPpg = await client.query(
                `SELECT payable_account_id FROM purchase_posting_groups WHERE company_id = $1 LIMIT 1`,
                [companyId],
              );
              mainAccountId = fallbackPpg.rows[0]?.payable_account_id || null;
            }
          } else if (isCustomer) {
            const partyRes = await client.query(
              `SELECT 
                  p.gl_account_receivable,
                  spg.receivable_account_id AS group_account_id
                FROM parties p
                LEFT JOIN sales_posting_groups spg 
                  ON p.sales_posting_group_id = spg.id
                WHERE p.id = $1 AND p.company_id = $2`,
              [line.party_id, companyId],
            );

            const party = partyRes.rows[0];
            mainAccountId =
              party?.gl_account_receivable || party?.group_account_id || null;

            if (!mainAccountId) {
              const fallbackSpg = await client.query(
                `SELECT receivable_account_id FROM sales_posting_groups WHERE company_id = $1 LIMIT 1`,
                [companyId],
              );
              mainAccountId =
                fallbackSpg.rows[0]?.receivable_account_id || null;
            }
          }
        }

        // Fallback to explicit line account_id if no party resolution occurred
        if (!mainAccountId) {
          mainAccountId = line.account_id || null;
        }

        if (!mainAccountId) {
          throw new Error(
            `Line is missing a valid G/L Account binding target.`,
          );
        }

        // 🛡️ VALIDATION 3: G/L Account Active & Posting Status
        await GLValidationService.validateAccount(client, mainAccountId);

        // Add Primary Leg
        expandedLegs.push({
          journal_line_id: line.journal_line_id,
          account_id: mainAccountId,
          party_type: line.party_type || null,
          party_id: line.party_id || null,
          document_type: line.document_type || null,
          description: line.description || journal.description || null,
          debit: debitLCY,
          credit: creditLCY,
          is_balancing: false,
        });

        // Add Offsetting Balancing Leg if inline reference_id exists
        if (line.reference_id) {
          await GLValidationService.validateAccount(client, line.reference_id);

          expandedLegs.push({
            journal_line_id: line.journal_line_id,
            account_id: line.reference_id,
            party_type: null,
            party_id: null,
            document_type: line.document_type || null,
            description: line.description
              ? `Balancing: ${line.description}`
              : journal.description || null,
            debit: creditLCY,
            credit: debitLCY,
            is_balancing: true,
          });
        }
      }

      // 🛡️ VALIDATION 4: Total Double-Entry Balance Check
      GLValidationService.validateBalanced(expandedLegs);

      // 4. Sequence Keys
      const txKeyResult = await client.query(
        "SELECT nextval('gl_transaction_id_seq') AS tx_id",
      );
      const nextTransactionId = parseInt(txKeyResult.rows[0].tx_id, 10);

      let vatTransactionId: number | null = null;
      const vatSettlementId: number | null = null;

      if (
        journal.source === "VAT_POSTING" ||
        journal.source === "SALES" ||
        journal.source === "PURCHASE"
      ) {
        const vatKeyResult = await client.query(
          "SELECT nextval('vat_transaction_id_seq') AS vat_tx_id",
        );
        vatTransactionId = parseInt(vatKeyResult.rows[0].vat_tx_id, 10);
      }

      // 5. Bulk insert validated legs into gl_ledger_entries
      for (const leg of expandedLegs) {
        // 1. Insert into gl_ledger_entries
        const insertedGlEntry = await client.query(
          `
          INSERT INTO gl_ledger_entries (
            company_id,
            account_id,
            transaction_id,
            vat_transaction_id,
            vat_settlement_transaction_id,
            source_journal_id,
            entry_no,
            posting_date,
            source_type,
            reference,
            description,
            debit,
            credit,
            party_type,
            party_id,
            posted_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
          RETURNING id
          `,
          [
            companyId,
            leg.account_id,
            nextTransactionId,
            vatTransactionId,
            vatSettlementId,
            journal.id,
            journal.entry_no,
            formattedDate,
            journal.source,
            journal.reference || null,
            leg.description,
            leg.debit,
            leg.credit,
            leg.party_type,
            leg.party_id,
          ],
        );

        const glLedgerEntryId = insertedGlEntry.rows[0].id;
        let subLedgerEntryId: string | null = null;

        // 2. CREATE SUB-LEDGER ENTRY IF A PARTY IS ATTACHED
        if (!leg.is_balancing && leg.party_id && leg.party_type) {
          const isSupplier = leg.party_type === "supplier";
          const subLedgerTable = isSupplier
            ? "vendor_ledger_entries"
            : "customer_ledger_entries";
          const partyCol = isSupplier ? "vendor_id" : "customer_id";

          // Standardize document type (PAYMENT vs INVOICE)
          // For AP (Supplier): Debit = Payment/Debit Note, Credit = Invoice/Bill
          // For AR (Customer): Credit = Payment/Credit Note, Debit = Invoice
          // let docType = "PAYMENT";
          // if (isSupplier) {
          //   docType = leg.debit > 0 ? "PAYMENT" : "INVOICE";
          // } else {
          //   docType = leg.credit > 0 ? "PAYMENT" : "INVOICE";
          // }

          let docType: string;

          // 1. Honor explicit UI document type selection if present
          if (leg.document_type) {
            const rawType = leg.document_type.toUpperCase();
            if (rawType === "REFUND") {
              docType = "REFUND";
            } else if (rawType === "DEBIT_NOTE") {
              docType = "DEBIT_NOTE";
            } else if (rawType === "CREDIT_NOTE" || rawType === "CREDIT_MEMO") {
              docType = isSupplier ? "CREDIT_MEMO" : "CREDIT_NOTE";
            } else if (
              rawType === "INVOICE" ||
              rawType === "PURCHASE_INVOICE"
            ) {
              docType = isSupplier ? "PURCHASE_INVOICE" : "SALES_INVOICE";
            } else if (rawType === "PAYMENT" || rawType === "VENDOR_PAYMENT") {
              docType = isSupplier ? "VENDOR_PAYMENT" : "PAYMENT";
            } else {
              docType = rawType;
            }
          } else {
            // 2. Default fallback based on debit/credit direction
            if (isSupplier) {
              docType = leg.debit > 0 ? "PAYMENT" : "PURCHASE_INVOICE";
            } else {
              docType = leg.credit > 0 ? "PAYMENT" : "SALES_INVOICE";
            }
          }

          const netAmount = leg.debit > 0 ? leg.debit : leg.credit;

          const insertedSubLedger = await client.query(
            `
            INSERT INTO ${subLedgerTable} (
              company_id,
              ${partyCol},
              document_type,
              document_id,
              document_no,
              posting_date,
              description,
              original_amount,
              remaining_amount,
              is_open,
              journal_entry_id,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, true, $9, NOW())
            RETURNING id
            `,
            [
              companyId,
              leg.party_id,
              docType,
              journal.id,
              journal.entry_no,
              formattedDate,
              leg.description,
              netAmount,
              journal.id,
            ],
          );

          subLedgerEntryId = insertedSubLedger.rows[0].id;
        }

        // Update allocations for primary sub-ledger legs
        if (!leg.is_balancing && leg.journal_line_id) {
          await client.query(
            `
            UPDATE ledger_allocations
            SET payment_entry_id = $1
            WHERE journal_line_id = $2
              AND company_id = $3
              AND is_unapplied = false
            `,
            [
              subLedgerEntryId || glLedgerEntryId,
              leg.journal_line_id,
              companyId,
            ],
          );
        }
      }

      // 6. Update Header status
      await client.query(
        `
        UPDATE journal_entries
        SET
          is_posted = true,
          posted_at = now(),
          updated_at = now()
        WHERE id = $1 AND company_id = $2
        `,
        [id, companyId],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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
}

/* static async post(companyId: string, id: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch the original draft unposted header to verify status
      const journalResult = await client.query(
        `
        SELECT id, entry_no, entry_date, source, reference, description
        FROM journal_entries
        WHERE id = $1 AND company_id = $2 AND is_posted = false
        FOR UPDATE
        `,
        [id, companyId],
      );

      if (journalResult.rows.length === 0) {
        throw new Error(
          "Journal entry not found, or it has already been posted.",
        );
      }

      const journal = journalResult.rows[0];

      // 2. Fetch the draft lines associated with this document
      const linesResult = await client.query(
        `
        SELECT account_id, party_type, party_id, description, debit, credit, exchange_rate
        FROM journal_entry_lines
        WHERE journal_id = $1
        `,
        [id],
      );

      if (linesResult.rows.length === 0) {
        throw new Error("Cannot post a journal entry with zero lines.");
      }

      // 3. Obtain next global GL transaction key from the PostgreSQL sequence
      const txKeyResult = await client.query(
        "SELECT nextval('gl_transaction_id_seq') AS tx_id",
      );
      const nextTransactionId = parseInt(txKeyResult.rows[0].tx_id, 10);

      // 4. (Optional) Check if VAT tracking numbers are required based on source type
      let vatTransactionId: number | null = null;
      const vatSettlementId: number | null = null;

      if (
        journal.source === "VAT_POSTING" ||
        journal.source === "SALES" ||
        journal.source === "PURCHASE"
      ) {
        const vatKeyResult = await client.query(
          "SELECT nextval('vat_transaction_id_seq') AS vat_tx_id",
        );
        vatTransactionId = parseInt(vatKeyResult.rows[0].vat_tx_id, 10);
      }

      // 5. Bulk insert lines cleanly into the 'gl_ledger_entries' table
      for (const line of linesResult.rows) {
        // Calculate Base Currency Amount (LCY) exactly as done during verification
        const rate = Number(line.exchange_rate || 1.0);
        const debitLCY = Number((Number(line.debit || 0) * rate).toFixed(2));
        const creditLCY = Number((Number(line.credit || 0) * rate).toFixed(2));

        await client.query(
          `
          INSERT INTO gl_ledger_entries (
            company_id,
            account_id,
            transaction_id,
            vat_transaction_id,
            vat_settlement_transaction_id,
            source_journal_id,
            entry_no,
            posting_date,
            source_type,
            reference,
            description,
            debit,
            credit,
            party_type,
            party_id,
            posted_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
          `,
          [
            companyId,
            line.account_id,
            nextTransactionId,
            vatTransactionId,
            vatSettlementId,
            journal.id,
            journal.entry_no,
            journal.entry_date,
            journal.source, // maps to journal_source_enum
            journal.reference,
            line.description || journal.description, // Fallback to header note if lines are empty
            debitLCY,
            creditLCY,
            line.party_type,
            line.party_id,
          ],
        );
      }

      // 6. Update the header flag on the draft workspace so it shows as 'posted'
      await client.query(
        `
        UPDATE journal_entries
        SET
          is_posted = true,
          posted_at = now()
        WHERE id = $1
        `,
        [id],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } */
/* for (const line of lines) {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      const rate = Number(line.exchange_rate || 1.0);

      if (debit > 0 && credit > 0) {
        throw new Error("Line cannot have both debit and credit");
      }

      // Legacy rule: If a line handles its own offset via a balancing account,
      // it bypasses the global document cross-line validation total sums.
      if (
        line.balancing_account_id &&
        line.balancing_account_id.trim() !== ""
      ) {
        continue;
      }

      if (debit > 0) {
        totalDebitConverted += Number((debit * rate).toFixed(2));
      }

      if (credit > 0) {
        totalCreditConverted += Number((credit * rate).toFixed(2));
      }
    } */
/**
 * Helper to fetch the control account from customer/supplier tables
 */
/* private static async getControlAccountForParty(
    client: PoolClient,
    companyId: string,
    partyId: string,
    type: "customer" | "supplier",
  ): Promise<string | null> {
    if (type === "customer") {
      // Join the unified parties row to its assigned Sales Posting Group profile
      const res = await client.query(
        `SELECT spg.receivable_account_id 
       FROM public.parties p
       INNER JOIN public.sales_posting_groups spg ON p.sales_posting_group_id = spg.id
       WHERE p.id = $1 
         AND p.company_id = $2 
         AND p.is_customer = true`,
        [partyId, companyId],
      );
      return res.rows[0]?.receivable_account_id || null;
    }

    if (type === "supplier") {
      // Join the unified parties row to its assigned Purchase Posting Group profile
      const res = await client.query(
        `SELECT ppg.payable_account_id 
       FROM public.parties p
       INNER JOIN public.purchase_posting_groups ppg ON p.purchase_posting_group_id = ppg.id
       WHERE p.id = $1 
         AND p.company_id = $2 
         AND p.is_supplier = true`,
        [partyId, companyId],
      );
      return res.rows[0]?.payable_account_id || null;
    }

    return null;
  } */
/* 
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
          SELECT 
            l.*,
            l.party_type::text AS raw_party_type,
            a.code AS account_code,
            a.name AS account_name, 
            p.name AS party_name,
            p.customer_code,
            p.supplier_code, 
            bal.code AS balancing_account_code,
            bal.name AS balancing_account_name
          FROM journal_entry_lines l
          LEFT JOIN chart_of_accounts a ON l.account_id = a.id
          LEFT JOIN public.parties p ON l.party_id = p.id
          LEFT JOIN chart_of_accounts bal ON l.reference_id = bal.id AND l.reference_type = 'G/L Account'
          WHERE l.journal_id = $1
          ORDER BY l.line_no ASC, l.created_at ASC
          `,
      [id],
    );

    const formattedLines = linesResult.rows.map((row) => {
      // Determine exact UI transaction_type
      let transactionType: "gl_no" | "customer" | "supplier" = "gl_no";

      if (row.raw_party_type === "customer" || row.customer_code) {
        transactionType = "customer";
      } else if (row.raw_party_type === "supplier" || row.supplier_code) {
        transactionType = "supplier";
      }

      return {
        ...row,
        transaction_type: transactionType,
        party_type:
          row.raw_party_type ||
          (transactionType !== "gl_no" ? transactionType : null),
      };
    });

    return {
      journal: journalResult.rows[0],
      lines: formattedLines,
    };
  }
*/
