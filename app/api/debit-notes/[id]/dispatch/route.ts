// app/api/debit-notes/[id]/dispatch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockDeAllocationService } from "@/lib/services/debit-notes/stock-deallocation.service";
import { DebitNoteService } from "@/lib/services/debit-notes/debit-note.service";
import { StockDeAllocationPayload } from "@/types/debit-note";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface IncomingDispatch {
  supplier_id: string;
  dispatch_date?: string;
  posting_date?: string;
  reference?: string;
  notes?: string;
}

interface IncomingLine {
  id?: string;
  debit_note_line_id?: string;
  line_type?: "ITEM" | "GL_ACCOUNT";
  item_id: string;
  warehouse_id: string;
  location_id?: string;
  bin_code?: string;
  batch_no?: string;
  serial_no?: string;
  expiry_date?: string;
  quantity: number | string;
  unit_price?: number | string;
  unit_cost?: number | string;
}

interface RequestBody {
  dispatch: IncomingDispatch;
  lines: IncomingLine[];
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: RequestBody = await req.json();
    const { dispatch, lines = [] } = body;

    const validLines = lines.filter(
      (l: IncomingLine) =>
        Number(l.quantity) > 0 &&
        (l.line_type === "ITEM" || (!l.line_type && !!l.item_id)),
    );

    if (!validLines.length) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid line quantities provided to dispatch.",
        },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    // 1. Structure payload for StockDeAllocationService
    const payload: StockDeAllocationPayload = {
      dispatch: {
        debit_note_id: id,
        vendor_id: dispatch.supplier_id,
        dispatch_date:
          dispatch.dispatch_date || new Date().toISOString().split("T")[0],
        posting_date:
          dispatch.posting_date || new Date().toISOString().split("T")[0],
        reference_no: dispatch.reference,
        notes: dispatch.notes,
      },
      lines: validLines.map((line: IncomingLine, idx: number) => ({
        line_no: idx + 1,
        debit_note_line_id: line.id || line.debit_note_line_id,
        item_id: line.item_id,
        warehouse_id: line.warehouse_id,
        location_id: line.location_id,
        bin_code: line.bin_code,
        batch_no: line.batch_no,
        serial_no: line.serial_no,
        expiry_date: line.expiry_date,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unit_price || line.unit_cost || 0),
      })),
    };

    // 2. Execute Transactional Dispatch (Stock Return & GL Ledger Entries)
    const dispatchResult = await StockDeAllocationService.createTransactional(
      client,
      companyId,
      payload,
    );

    // 3. Recalculate Debit Note status dynamically
    await DebitNoteService.recalculateStatus(client, id);

    await client.query("COMMIT");
    return NextResponse.json({ success: true, dispatchId: dispatchResult.id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Stock dispatch error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to dispatch stock",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
