// /app/api/finance/general-journal/[id]/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await pool.connect();

  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await client.query("BEGIN");

    // 1. Fetch & lock draft journal entry
    const journalCheck = await client.query(
      `
      SELECT entry_date, is_posted, entry_no, source, reference, description, currency_id, exchange_rate
      FROM journal_entries 
      WHERE id = $1 AND company_id = $2
      FOR UPDATE
      `,
      [id, companyId],
    );

    if (journalCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Journal entry not found." },
        { status: 404 },
      );
    }

    const journal = journalCheck.rows[0];

    if (journal.is_posted) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "This journal entry has already been posted to the ledgers." },
        { status: 400 },
      );
    }

    // 2. Enforce posting date restrictions
    const formattedDate =
      journal.entry_date instanceof Date
        ? journal.entry_date.toISOString().split("T")[0]
        : String(journal.entry_date);

    const gateCheck = await validateLedgerPostingDate(companyId, formattedDate);
    if (!gateCheck.allowed) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: gateCheck.reason }, { status: 400 });
    }

    // 3. Load draft lines from journal_entry_lines
    const linesRes = await client.query(
      `
      SELECT account_id, description, party_id, item_id, warehouse_id, quantity, unit_cost, debit, credit, reference_type, reference_id, currency_amount
      FROM journal_entry_lines
      WHERE journal_id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    if (!linesRes.rows.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Cannot post an empty journal entry without lines." },
        { status: 400 },
      );
    }

    // 4. Use existing GLPostingService to write ledger records
    await GLPostingService.postJournal(client, {
      company_id: companyId,
      entry_date: formattedDate,
      source: journal.source || "GENERAL",
      journal_type: "GENERAL_JOURNAL",
      reference: journal.reference || journal.entry_no,
      source_id: id,
      description: journal.description,
      currency_id: journal.currency_id,
      exchange_rate: journal.exchange_rate,
      lines: linesRes.rows.map((line) => ({
        account_id: line.account_id,
        description: line.description,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        party_id: line.party_id,
        item_id: line.item_id,
        warehouse_id: line.warehouse_id,
        quantity: line.quantity ? Number(line.quantity) : null,
        unit_cost: line.unit_cost ? Number(line.unit_cost) : null,
        reference_type: line.reference_type,
        reference_id: line.reference_id,
        currency_amount: line.currency_amount
          ? Number(line.currency_amount)
          : null,
      })),
    });

    // 5. Delete temporary draft entry so we don't duplicate journal_entries rows
    await client.query(
      `DELETE FROM journal_entry_lines WHERE journal_id = $1 AND company_id = $2`,
      [id, companyId],
    );
    await client.query(
      `DELETE FROM journal_entries WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    const dbError = err as { message?: string };
    console.error("General Journal Posting Engine Error:", err);
    return NextResponse.json(
      {
        error:
          dbError.message || "Failed to finalize ledger post transaction item.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Authenticate and enforce company-level isolation
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 2. Fetch the target entry_date first to pass into our gatekeeper validator
    const journalCheck = await pool.query(
      `
      SELECT entry_date, is_posted 
      FROM journal_entries 
      WHERE id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    if (journalCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Journal entry not found." },
        { status: 404 },
      );
    }

    const { entry_date, is_posted } = journalCheck.rows[0];

    // Early exit if the record has already been locked and posted
    if (is_posted) {
      return NextResponse.json(
        { error: "This journal entry has already been posted to the ledgers." },
        { status: 400 },
      );
    }

    // 3. Run the target accounting period restriction date check 🛡️
    // Format entry_date to string (YYYY-MM-DD) just in case it returns as a full Date object
    const formattedDate =
      entry_date instanceof Date
        ? entry_date.toISOString().split("T")[0]
        : String(entry_date);

    const gateCheck = await validateLedgerPostingDate(companyId, formattedDate);

    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 400 });
    }

    // 4. Proceed with final posting execution now that the gatekeeper has cleared it
    await pool.query(
      `
      UPDATE journal_entries
      SET 
        is_posted = true, 
        posted_at = now(),
        updated_at = now()
      WHERE id = $1 
        AND company_id = $2
      `,
      [id, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("General Journal Posting Engine Error:", err);
    return NextResponse.json(
      {
        error:
          dbError.message || "Failed to finalize ledger post transaction item.",
      },
      { status: 500 },
    );
  }
} */
