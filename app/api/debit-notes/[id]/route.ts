// app/api/debit-notes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { DebitNoteService } from "@/lib/services/debit-notes/debit-note.service";
import { StockDeAllocationService } from "@/lib/services/debit-notes/stock-deallocation.service";
import { StockDeAllocationRecord } from "@/app/components/shared/modals/StockDeAllocationModal";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface IncomingLine {
  id?: string;
  debit_note_line_id?: string;
  line_type?: "ITEM" | "GL_ACCOUNT" | "COMMENT";
  item_id: string;
  gl_account_id?: string;
  warehouse_id: string;
  location_id?: string;
  bin_code?: string;
  batch_no?: string;
  serial_no?: string;
  expiry_date?: string;
  quantity: number | string;
  unit_price?: number | string;
  unit_cost?: number | string;
  allocations?: StockDeAllocationRecord[];
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await DebitNoteService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Debit note not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Debit note get error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load debit note",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { note, lines } = body;

    await client.query("BEGIN");

    // 1. Core update operation
    const dbLines = await DebitNoteService.update(
      client,
      companyId,
      id,
      body
    );

    // 2. Iterate safely using order indexes to guarantee accurate mapping of newly generated/updated IDs
    for (let i = 0; i < (lines || []).length; i++) {
      const payloadLine = lines[i];
      const matchedDbLine = dbLines[i]; // Matches lines sequentially exactly how they were updated/saved

      if (
        matchedDbLine?.id &&
        matchedDbLine?.item_id &&
        matchedDbLine?.warehouse_id &&
        payloadLine.allocations?.length
      ) {
        await DebitNoteService.saveLineAllocations(
          client,
          companyId,
          id,
          matchedDbLine.id,
          matchedDbLine.item_id,
          matchedDbLine.warehouse_id,
          payloadLine.allocations
        );
      }
    }

    // 3. Downstream Automated Stock Dispatch integration if explicitly marked as posted/dispatched
    if (note?.status === "posted" || note?.status === "dispatched") {
      const dispatchLinesPayload = (lines || [])
        .map((line: IncomingLine, idx: number) => {
          const matchedDbLine = dbLines[idx];
          return {
            ...line,
            // Ensure debit_note_line_id gets resolved correctly from updated DB lines
            debit_note_line_id:
              line.id || line.debit_note_line_id || matchedDbLine?.id,
          };
        })
        .filter(
          (l: IncomingLine) =>
            Number(l.quantity) > 0 &&
            (l.line_type === "ITEM" || (!l.line_type && !!l.item_id))
        );

      if (dispatchLinesPayload.length) {
        // Calculate remaining un-returned quantity before attempting outbound dispatch
        const dnLinesResult = await client.query(
          `SELECT id, quantity, COALESCE(returned_quantity, 0) as returned_quantity 
           FROM debit_note_lines 
           WHERE debit_note_id = $1 AND COALESCE(is_deleted, false) = false`,
          [id]
        );

        const hasUnreturnedItems = dnLinesResult.rows.some((row) => {
          const remaining =
            Number(row.quantity) - Number(row.returned_quantity || 0);
          return remaining > 0;
        });

        if (hasUnreturnedItems) {
          const dispatchPayload = {
            dispatch: {
              debit_note_id: id,
              vendor_id: note.vendor_id || note.supplier_id,
              warehouse_id:
                note.warehouse_id || dispatchLinesPayload[0]?.warehouse_id || null,
              dispatch_date:
                note.dispatch_date || new Date().toISOString().split("T")[0],
              posting_date:
                note.posting_date || new Date().toISOString().split("T")[0],
              reference_no: note.reference,
              notes: note.notes,
            },
            lines: dispatchLinesPayload.map(
              (line: IncomingLine, idx: number) => ({
                line_no: idx + 1,
                debit_note_line_id: line.debit_note_line_id,
                item_id: line.item_id,
                warehouse_id: line.warehouse_id,
                location_id: line.location_id,
                bin_code: line.bin_code,
                batch_no: line.batch_no,
                serial_no: line.serial_no,
                expiry_date: line.expiry_date,
                quantity: Number(line.quantity),
                unit_cost: Number(line.unit_price || line.unit_cost || 0),
              })
            ),
          };

          await StockDeAllocationService.createTransactional(
            client,
            companyId,
            dispatchPayload
          );
        }
      }

      await DebitNoteService.recalculateStatus(client, id);
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, data: { lines: dbLines } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Debit note update transactional engine crash:", err);

    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to update debit note pipeline";

    // Check for business validation errors and return 400 instead of 500
    if (errorMessage.includes("exceeds remaining open line quantity")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This debit note (or line) has already been fully dispatched/returned. Cannot dispatch additional stock.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const stockDispatchLineId = searchParams.get("stockDispatchLineId");

    // Pattern: Safe Line Deletion & Modification Hook
    if (stockDispatchLineId) {
      const result = await StockDeAllocationService.safeDeleteDispatchLine(
        companyId,
        stockDispatchLineId
      );
      return NextResponse.json({ success: true, data: result });
    }

    await DebitNoteService.delete(companyId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Debit note delete error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete debit note",
      },
      {
        status: 500,
      }
    );
  }
}
