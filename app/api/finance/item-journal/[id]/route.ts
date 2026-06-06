// /app/api/finance/item-journal/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { ItemJournalService } from "@/lib/services/item-journal.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const headerResult = await pool.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (headerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Inventory adjustment voucher not found" },
        { status: 404 },
      );
    }

    // Pull individual ledger row segments
    const linesResult = await pool.query(
      `
      SELECT l.*, a.code as account_code, a.name as account_name
      FROM journal_entry_lines l
      JOIN chart_of_accounts a ON a.id = l.account_id
      WHERE l.journal_id = $1
      ORDER BY l.id ASC
      `,
      [id],
    );

    // 🌟 Grab inventory movement rows to map batch and serial records back onto lines
    const allocationsResult = await pool.query(
      `
      SELECT item_id, warehouse_id, location_id, batch_no, serial_no, 
             ABS(quantity) as quantity, date_received, prod_date, expiry_date
      FROM inventory_movements
      WHERE reference_id = $1 AND movement_type = 'ITEM_JOURNAL'
      `,
      [id],
    );

    // Nest historical stock entries inside their respective line row blocks
    const linesWithAllocations = linesResult.rows.map((line) => {
      const associatedAllocations = allocationsResult.rows
        .filter(
          (alloc) =>
            alloc.item_id === line.item_id &&
            alloc.warehouse_id === line.warehouse_id &&
            alloc.location_id === line.location_id,
        )
        .map((alloc) => ({
          date_received: alloc.date_received
            ? alloc.date_received.toISOString().split("T")[0]
            : "",
          prod_date: alloc.prod_date
            ? alloc.prod_date.toISOString().split("T")[0]
            : "",
          expiry_date: alloc.expiry_date
            ? alloc.expiry_date.toISOString().split("T")[0]
            : "",
          batch_no: alloc.batch_no || "",
          serial_no: alloc.serial_no || "",
          quantity: Number(alloc.quantity || 0),
        }));

      return {
        ...line,
        allocations: associatedAllocations,
      };
    });

    return NextResponse.json({
      journal: headerResult.rows[0],
      lines: linesWithAllocations,
    });
  } catch (err) {
    console.error("Get Individual Item Entry Exception:", err);
    return NextResponse.json(
      { error: "Failed to read specific voucher elements" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // 🌟 Route changes dynamically through ItemJournalService to overwrite tracking maps safely
    await ItemJournalService.update(companyId, id, {
      entry_date: body.entry_date,
      reference: body.reference,
      description: body.description,
      lines: body.lines,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Update Item Adjustment Exception:", err);
    return NextResponse.json(
      {
        error:
          dbError.message ||
          "Failed to update target inventory adjustments list matrix",
      },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { JournalService } from "@/lib/services/journal.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const headerResult = await pool.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (headerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Inventory adjustment voucher not found" },
        { status: 404 },
      );
    }

    // Pull splitting rows, linking the item catalog names for display references
    const linesResult = await pool.query(
      `
      SELECT l.*, a.code as account_code, a.name as account_name
      FROM journal_entry_lines l
      JOIN chart_of_accounts a ON a.id = l.account_id
      WHERE l.journal_id = $1
      ORDER BY l.id ASC
      `,
      [id],
    );

    return NextResponse.json({
      journal: headerResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (err) {
    console.error("Get Individual Item Entry Exception:", err);
    return NextResponse.json(
      { error: "Failed to read specific voucher elements" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const balancedPayload = {
      entry_date: body.entry_date,
      source: "ITEM_JOURNAL" as const,
      reference: body.reference,
      description: body.description,
      lines: body.lines,
    };

    await JournalService.update(companyId, id, balancedPayload);
    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Update Item Adjustment Exception:", err);
    return NextResponse.json(
      {
        error:
          dbError.message ||
          "Failed to update target inventory adjustments list matrix",
      },
      { status: 500 },
    );
  }
} */
