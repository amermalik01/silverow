// lib/services/gl/gl-posting.service.ts
import { PoolClient } from "pg";

export type GLJournalSource =
  | "GENERAL"
  | "SALES"
  | "PURCHASE"
  | "PAYMENT"
  | "RECEIPT"
  | "INVENTORY";

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
