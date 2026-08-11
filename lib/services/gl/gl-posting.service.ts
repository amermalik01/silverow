// lib/services/gl/gl-posting.service.ts
import { PoolClient } from "pg";

export type GLJournalSource =
  | "GENERAL"
  | "SALES"
  | "PURCHASE"
  | "PAYMENT"
  | "RECEIPT"
  | "INVENTORY"
  | "SUPPLIER_JOURNAL"
  | "CUSTOMER_JOURNAL";

export type GLLineInput = {
  account_id?: string | null;
  party_id?: string | null;
  party_type?: string | null;
  description?: string | null;

  debit?: number;
  credit?: number;

  balancing_account_id?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;

  item_id?: string | null;
  warehouse_id?: string | null;
  quantity?: number | null;
  unit_cost?: number | null;
  currency_amount?: number | null;
};

export type PostGLTransactionInput = {
  company_id: string;
  entry_date: string;

  source: GLJournalSource;

  journal_type: string;

  reference?: string | null;
  source_id?: string | null;
  description?: string | null;

  currency_id?: string | null;
  exchange_rate?: number;

  created_by?: string | null;

  lines: GLLineInput[];
};

export class GLPostingService {
  /**
   * Universal Double-Entry Posting Engine
   * Handles direct operational postings (PO/SO stock receipts, invoices)
   * and sub-ledger journal postings (Supplier/Customer Journals).
   */
  static async postJournal(
    client: PoolClient,
    data: PostGLTransactionInput,
  ): Promise<{
    id: string;
    entry_no: string;
  }> {
    // 1. Expand input lines into concrete Debit and Credit legs
    const expandedLines: Array<{
      account_id: string;
      party_id: string | null;
      party_type: string | null;
      debit: number;
      credit: number;
      description: string | null;
      item_id: string | null;
      warehouse_id: string | null;
      quantity: number | null;
      unit_cost: number | null;
    }> = [];

    for (const line of data.lines) {
      const debitVal = Number(line.debit || 0);
      const creditVal = Number(line.credit || 0);
      const mainAccountId = line.account_id || "";
      const balancingAccountId = line.balancing_account_id;

      // Primary Leg
      if (mainAccountId || line.party_id) {
        expandedLines.push({
          account_id: mainAccountId,
          party_id: line.party_id || null,
          party_type: line.party_type || null,
          debit: debitVal,
          credit: creditVal,
          description: line.description || data.description || null,
          item_id: line.item_id || null,
          warehouse_id: line.warehouse_id || null,
          quantity: line.quantity || null,
          unit_cost: line.unit_cost || null,
        });
      }

      // Offsetting Balancing Leg (Inverts Debit <-> Credit)
      if (balancingAccountId) {
        expandedLines.push({
          account_id: balancingAccountId,
          party_id: null,
          party_type: null,
          debit: creditVal,
          credit: debitVal,
          description: line.description
            ? `Balancing: ${line.description}`
            : data.description || null,
          item_id: line.item_id || null,
          warehouse_id: line.warehouse_id || null,
          quantity: line.quantity || null,
          unit_cost: line.unit_cost || null,
        });
      }
    }

    // 2. Validate double-entry equality (\sum Debit = \sum Credit)
    const totalDebit = expandedLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = expandedLines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(
        `Journal is not balanced. Total Debit (${totalDebit.toFixed(
          2,
        )}) must equal Total Credit (${totalCredit.toFixed(2)}).`,
      );
    }

    if (expandedLines.length < 2) {
      throw new Error(
        "A valid posting requires at least 2 ledger entries (1 Debit and 1 Credit).",
      );
    }

    // 3. Resolve Sequence Code
    const moduleSequenceMap: Record<string, string> = {
      PURCHASE: "supplier_journal",
      SUPPLIER_JOURNAL: "supplier_journal",
      SALES: "customer_journal",
      CUSTOMER_JOURNAL: "customer_journal",
      INVENTORY: "item_journal",
      GENERAL: "gl_journal",
    };

    const sequenceModule = moduleSequenceMap[data.source] || "gl_journal";

    const seqResult = await client.query(
      `SELECT get_next_sequence($1, $2) AS code`,
      [data.company_id, sequenceModule],
    );

    const entryNo = seqResult.rows[0].code;

    // 4. Insert Header into journal_entries
    const headerResult = await client.query(
      `
      INSERT INTO journal_entries (
        company_id, entry_no, entry_date, source, journal_type,
        reference, source_id, description, currency_id, exchange_rate,
        is_posted, posted_at, created_by, created_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        true, now(), $11, now()
      )
      RETURNING id, entry_no
      `,
      [
        data.company_id,
        entryNo,
        data.entry_date,
        data.source,
        data.journal_type,
        data.reference || null,
        data.source_id || null,
        data.description || null,
        data.currency_id || null,
        data.exchange_rate || 1,
        data.created_by || null,
      ],
    );

    const journal = headerResult.rows[0];
    const journalId = journal.id;
    let lineNo = 10000;

    // 5. Pre-fetch default AP/AR Accounts if any lines lack an explicit account_id
    let defaultPayableAccId: string | null = null;
    let defaultReceivableAccId: string | null = null;

    const needsPayable = expandedLines.some(
      (l) =>
        !l.account_id &&
        (l.party_type === "supplier" ||
          data.source === "SUPPLIER_JOURNAL" ||
          data.source === "PURCHASE"),
    );

    const needsReceivable = expandedLines.some(
      (l) =>
        !l.account_id &&
        (l.party_type === "customer" ||
          data.source === "CUSTOMER_JOURNAL" ||
          data.source === "SALES"),
    );

    if (needsPayable) {
      const ppg = await client.query(
        `SELECT payable_account_id FROM purchase_posting_groups WHERE company_id = $1 LIMIT 1`,
        [data.company_id],
      );
      defaultPayableAccId = ppg.rows[0]?.payable_account_id || null;
    }

    if (needsReceivable) {
      const spg = await client.query(
        `SELECT receivable_account_id FROM sales_posting_groups WHERE company_id = $1 LIMIT 1`,
        [data.company_id],
      );
      defaultReceivableAccId = spg.rows[0]?.receivable_account_id || null;
    }

    // 6. Post expanded lines to journal_entry_lines and gl_ledger_entries
    for (const leg of expandedLines) {
      let resolvedAccountId = leg.account_id;

      // Fallback AP/AR resolution for sub-ledger journal entries without direct account_id
      if (!resolvedAccountId && leg.party_id) {
        if (
          leg.party_type === "supplier" ||
          data.source === "SUPPLIER_JOURNAL" ||
          data.source === "PURCHASE"
        ) {
          resolvedAccountId = defaultPayableAccId || "";
        } else if (
          leg.party_type === "customer" ||
          data.source === "CUSTOMER_JOURNAL" ||
          data.source === "SALES"
        ) {
          resolvedAccountId = defaultReceivableAccId || "";
        }
      }

      if (!resolvedAccountId) {
        throw new Error(
          `Unable to resolve G/L account for entry line with party ID: ${
            leg.party_id || "None"
          }. Ensure posting groups are configured.`,
        );
      }

      // Verify account validity in Chart of Accounts
      const coaCheck = await client.query(
        `SELECT id, is_active, is_posting FROM chart_of_accounts WHERE id = $1 AND company_id = $2`,
        [resolvedAccountId, data.company_id],
      );

      if (!coaCheck.rows.length) {
        throw new Error(
          `Target G/L Account ID '${resolvedAccountId}' does not exist in Chart of Accounts.`,
        );
      }
      if (!coaCheck.rows[0].is_active) {
        throw new Error(`G/L Account '${resolvedAccountId}' is inactive.`);
      }

      // Write to journal_entry_lines
      await client.query(
        `
        INSERT INTO journal_entry_lines (
          company_id, journal_id, line_no, account_id, party_id,
          item_id, warehouse_id, description, quantity, unit_cost,
          debit, credit, created_at
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, now()
        )
        `,
        [
          data.company_id,
          journalId,
          lineNo,
          resolvedAccountId,
          leg.party_id,
          leg.item_id,
          leg.warehouse_id,
          leg.description,
          leg.quantity,
          leg.unit_cost,
          leg.debit,
          leg.credit,
        ],
      );

      // Determine party_type for gl_ledger_entries sub-ledger reporting
      let subLedgerPartyType = leg.party_type;
      if (!subLedgerPartyType) {
        if (data.source === "PURCHASE" || data.source === "SUPPLIER_JOURNAL") {
          subLedgerPartyType = "supplier";
        } else if (
          data.source === "SALES" ||
          data.source === "CUSTOMER_JOURNAL"
        ) {
          subLedgerPartyType = "customer";
        }
      }

      // Write to gl_ledger_entries
      await client.query(
        `
        INSERT INTO gl_ledger_entries (
          company_id, account_id, source_journal_id, entry_no, posting_date,
          source_type, reference, description, debit, credit,
          party_type, party_id, document_no, posted_by, posted_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        `,
        [
          data.company_id,
          resolvedAccountId,
          journalId,
          entryNo,
          data.entry_date,
          data.source,
          data.reference || null,
          leg.description,
          leg.debit,
          leg.credit,
          subLedgerPartyType || null,
          leg.party_id,
          data.reference || entryNo,
          data.created_by || null,
        ],
      );

      lineNo += 10000;
    }

    return journal;
  }
}

/* export class GLPostingService {
  //  * =========================================================
  //  * POST JOURNAL
  //  * =========================================================

  static async postJournal(
    client: PoolClient,
    data: PostGLTransactionInput,
  ): Promise<{
    id: string;
    entry_no: string;
  }> {
    // 1. Expand single UI lines into explicit Debit and Credit pairs
    const expandedLines: Array<{
      account_id: string;
      party_id: string | null;
      party_type: string | null;
      debit: number;
      credit: number;
      description: string | null;
    }> = [];

    for (const line of data.lines) {
      const debitVal = Number(line.debit || 0);
      const creditVal = Number(line.credit || 0);
      const mainAccountId = line.account_id;
      const balancingAccountId = line.balancing_account_id || line.reference_id;

      // Primary Leg
      if (mainAccountId || line.party_id) {
        expandedLines.push({
          account_id: mainAccountId || "",
          party_id: line.party_id || null,
          party_type: line.party_type || null,
          debit: debitVal,
          credit: creditVal,
          description: line.description || data.description || null,
        });
      }

      // Offsetting Balancing Leg (Inverts Debit <-> Credit)
      if (balancingAccountId) {
        expandedLines.push({
          account_id: balancingAccountId,
          party_id: null,
          party_type: null,
          debit: creditVal, // Swapped: line credit becomes balancing debit
          credit: debitVal, // Swapped: line debit becomes balancing credit
          description: line.description
            ? `Balancing: ${line.description}`
            : data.description || null,
        });
      }
    }

    // 2. Enforce Double-Entry Balancing Rule (\sum Debit = \sum Credit)
    const totalDebit = expandedLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = expandedLines.reduce((sum, l) => sum + l.credit, 0);

    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
      throw new Error(
        `Journal is not balanced. Total Debit (${totalDebit.toFixed(
          2,
        )}) must equal Total Credit (${totalCredit.toFixed(2)}).`,
      );
    }

    if (expandedLines.length < 2) {
      throw new Error(
        "A valid posting requires at least 2 ledger entries (1 Debit and 1 Credit).",
      );
    }

    // 3. Resolve Sequence Code
    const moduleSequenceMap: Record<string, string> = {
      PURCHASE: "supplier_journal",
      SUPPLIER_JOURNAL: "supplier_journal",
      SALES: "customer_journal",
      CUSTOMER_JOURNAL: "customer_journal",
      INVENTORY: "item_journal",
      GENERAL: "gl_journal",
    };

    const sequenceModule = moduleSequenceMap[data.source] || "gl_journal";

    const seqResult = await client.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [data.company_id, sequenceModule],
    );

    const entryNo = seqResult.rows[0].code;

    // 4. Create Header in journal_entries
    const headerResult = await client.query(
      `
      INSERT INTO journal_entries (
        company_id,
        entry_no,
        entry_date,
        source,
        journal_type,
        reference,
        source_id,
        description,
        currency_id,
        exchange_rate,
        is_posted,
        posted_at,
        created_by,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        true,now(),$11,now()
      )
      RETURNING id, entry_no
      `,
      [
        data.company_id,
        entryNo,
        data.entry_date,
        data.source,
        data.journal_type,
        data.reference || null,
        data.source_id || null,
        data.description || null,
        data.currency_id || null,
        data.exchange_rate || 1,
        data.created_by || null,
      ],
    );
    const journal = headerResult.rows[0];
    let lineNo = 10000;

    const journalId = journal.id;

    // 5. Post all expanded legs to gl_ledger_entries
    for (const leg of expandedLines) {
      // Resolve AP/AR control account if main account is blank but party_id is present
      let resolvedAccountId = leg.account_id;

      if (!resolvedAccountId && leg.party_id) {
        if (
          leg.party_type === "supplier" ||
          data.source === "SUPPLIER_JOURNAL"
        ) {
          const ppg = await client.query(
            `SELECT payable_account_id FROM purchase_posting_groups WHERE company_id = $1 LIMIT 1`,
            [data.company_id],
          );
          resolvedAccountId = ppg.rows[0]?.payable_account_id;
        } else if (
          leg.party_type === "customer" ||
          data.source === "CUSTOMER_JOURNAL"
        ) {
          const spg = await client.query(
            `SELECT receivable_account_id FROM sales_posting_groups WHERE company_id = $1 LIMIT 1`,
            [data.company_id],
          );
          resolvedAccountId = spg.rows[0]?.receivable_account_id;
        }
      }

      if (!resolvedAccountId) {
        throw new Error(
          `Unable to resolve G/L account for party profile ${leg.party_id || "Unknown"}`,
        );
      }

      // Write to gl_ledger_entries
      await client.query(
        `
        INSERT INTO gl_ledger_entries (
          company_id, account_id, source_journal_id, entry_no, posting_date,
          source_type, reference, description, debit, credit,
          party_type, party_id, document_no, posted_by, posted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        `,
        [
          data.company_id,
          resolvedAccountId,
          journalId,
          entryNo,
          data.entry_date,
          data.source,
          data.reference || null,
          leg.description,
          leg.debit,
          leg.credit,
          leg.party_type || null,
          leg.party_id || null,
          data.reference || entryNo,
          data.created_by || null,
        ],
      );

      lineNo += 10000;
    }

    return journal;
  }
} */

/* 
import { PoolClient } from "pg";

export type GLJournalSource =
  | "GENERAL"
  | "SALES"
  | "PURCHASE"
  | "PAYMENT"
  | "RECEIPT"
  | "INVENTORY"
  | "SUPPLIER_JOURNAL"
  | "CUSTOMER_JOURNAL";

export type GLLineInput = {
  account_id: string;
  description?: string | null;

  debit?: number;
  credit?: number;

  party_id?: string | null;
  item_id?: string | null;
  warehouse_id?: string | null;

  quantity?: number | null;
  unit_cost?: number | null;

  reference_type?: string | null;
  reference_id?: string | null;

  currency_amount?: number | null;
};

export type PostGLTransactionInput = {
  company_id: string;
  entry_date: string;

  source: GLJournalSource;

  journal_type: string;

  reference?: string | null;
  source_id?: string | null;
  description?: string | null;

  currency_id?: string | null;
  exchange_rate?: number;

  created_by?: string | null;

  lines: GLLineInput[];
};

export class GLPostingService {
  //  * =========================================================
  //  * POST JOURNAL
  //  * =========================================================

  static async postJournal(
    client: PoolClient,
    data: PostGLTransactionInput,
  ): Promise<{
    id: string;
    entry_no: string;
  }> {
    const totalDebit = data.lines.reduce(
      (sum, line) => sum + Number(line.debit || 0),
      0,
    );

    const totalCredit = data.lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0,
    );

    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
      throw new Error(
        `Journal is not balanced. Debit=${totalDebit} Credit=${totalCredit}`,
      );
    }

    // Dynamically map GL source to your existing ref_modules keys
    const moduleSequenceMap: Record<string, string> = {
      PURCHASE: "supplier_journal",
      SALES: "customer_journal",
      INVENTORY: "item_journal",
      GENERAL: "gl_journal",
    };

    const sequenceModule = moduleSequenceMap[data.source] || "gl_journal";

    const seqResult = await client.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      // [data.company_id, "journal_entry"],
      [data.company_id, sequenceModule],
    );

    const entryNo = seqResult.rows[0].code;

    const headerResult = await client.query(
      `
      INSERT INTO journal_entries (
        company_id,
        entry_no,
        entry_date,
        source,
        journal_type,
        reference,
        source_id,
        description,
        currency_id,
        exchange_rate,
        is_posted,
        posted_at,
        created_by,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        true,now(),$11,now()
      )
      RETURNING id, entry_no
      `,
      [
        data.company_id,
        entryNo,
        data.entry_date,
        data.source,
        data.journal_type,
        data.reference || null,
        data.source_id || null,
        data.description || null,
        data.currency_id || null,
        data.exchange_rate || 1,
        data.created_by || null,
      ],
    );
    const journal = headerResult.rows[0];

    const journalId = journal.id;

    let lineNo = 10000;

    for (const line of data.lines) {
      const coaResult = await client.query(
        `
        SELECT
          is_active,
          is_posting
        FROM chart_of_accounts
        WHERE id = $1
        `,
        [line.account_id],
      );

      if (!coaResult.rows.length) {
        throw new Error("GL account not found");
      }

      const account = coaResult.rows[0];

      if (!account.is_active) {
        throw new Error("GL account is inactive");
      }

      if (!account.is_posting) {
        throw new Error("GL account is not a posting account");
      }

      await client.query(
        `
        INSERT INTO journal_entry_lines (
          company_id,
          journal_id,
          line_no,
          account_id,
          party_id,
          item_id,
          warehouse_id,
          description,
          quantity,
          unit_cost,
          debit,
          credit,
          reference_type,
          reference_id,
          currency_amount,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,
          now()
        )
        `,
        [
          data.company_id,
          journalId,
          lineNo,

          line.account_id,
          line.party_id || null,
          line.item_id || null,
          line.warehouse_id || null,

          line.description || null,

          line.quantity || null,
          line.unit_cost || null,

          line.debit || 0,
          line.credit || 0,

          line.reference_type || null,
          line.reference_id || null,

          line.currency_amount || null,
        ],
      );

      // 2. 🌟 NEW: Directly populate the gl_ledger_entries table for real-time reporting!

      let partyType: "customer" | "supplier" | "employee" | null = null;

      if (data.source === "PURCHASE") {
        partyType = "supplier";
      } else if (data.source === "SALES") {
        partyType = "customer";
      }

      await client.query(
        `
        INSERT INTO gl_ledger_entries (
          company_id,
          account_id,
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
          document_no,
          posted_by,
          posted_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        `,
        [
          data.company_id,
          line.account_id,
          journalId,
          entryNo,
          data.entry_date,
          data.source,
          data.reference || null,
          line.description || data.description,
          line.debit || 0,
          line.credit || 0,
          partyType,
          line.party_id || null,
          data.reference || null,
          data.created_by || null,
        ],
      );

      lineNo += 10000;
    }

    return journal;
  }
}

*/
