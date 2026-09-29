// app/api/debit-notes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { DebitNoteService } from "@/lib/services/debit-notes/debit-note.service";
import { StockDeAllocationService } from "@/lib/services/debit-notes/stock-deallocation.service";
import { StockDeAllocationRecord } from "@/app/components/shared/modals/StockDeAllocationModal";
import { StockDeAllocationValidationService } from "@/lib/services/debit-notes/stock-deallocation-validation.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface IncomingLine {
  id?: string;
  line_no?: number;
  debit_note_line_id?: string;
  purchase_invoice_line_id?: string;
  purchase_order_line_id?: string;
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
        { status: 401 },
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
        },
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
      },
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
        { status: 401 },
      );
    }

    const body = await req.json();

    const normalizedPayload = {
      debitNote: body.debitNote || body.note || body,
      lines: body.lines || [],
      primary_address: body.primary_address,
      billing_address: body.billing_address,
      shipping_address: body.shipping_address,
    };

    // const { note, lines } = body;

    await client.query("BEGIN");

    const dbLines = await DebitNoteService.update(
      client,
      companyId,
      id,
      normalizedPayload,
    );

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
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
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
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const stockDispatchLineId = searchParams.get("stockDispatchLineId");

    // Pattern: Safe Line Deletion & Modification Hook
    if (stockDispatchLineId) {
      const result = await StockDeAllocationService.safeDeleteDispatchLine(
        companyId,
        stockDispatchLineId,
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
          err instanceof Error ? err.message : "Failed to delete debit note",
      },
      {
        status: 500,
      },
    );
  }
}
