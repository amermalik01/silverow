// app/api/purchase-orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";
// import { InventoryAllocationEngineService } from "@/lib/services/inventory/inventory-allocation-engine.service";
import { PurchaseReceiptService } from "@/lib/services/purchase-receipts/purchase-receipt.service";
import { PurchaseReceiptPayload } from "@/types/purchase-receipt";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface IncomingLine {
  id?: string;
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

    const data = await PurchaseOrderService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase order not found",
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
    console.error("Purchase order get error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load purchase order",
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
    const { order, lines } = body;

    await client.query("BEGIN");

    // 1. Core update operation
    const dbLines = await PurchaseOrderService.update(
      client,
      companyId,
      id,
      body,
    );

    // 2. Iterate safely using order indexes to guarantee accurate mapping of newly generated IDs
    for (let i = 0; i < lines.length; i++) {
      const payloadLine = lines[i];
      const matchedDbLine = dbLines[i]; // Matches lines sequentially exactly how they were updated/saved

      if (matchedDbLine && payloadLine.allocations) {
        await PurchaseOrderService.saveLineAllocations(
          client,
          companyId,
          id,
          matchedDbLine.id,
          matchedDbLine.item_id,
          matchedDbLine.warehouse_id,
          payloadLine.allocations || [],
        );
      }
    }

    // 4. Downstream Automated Ledger integration if explicitly marked as processed
    if (order?.status === "received") {
      const receiptLinesPayload = lines
        .map((line: IncomingLine, idx: number) => {
          const matchedDbLine = dbLines[idx];
          return {
            ...line,
            // Ensure purchase_order_line_id gets resolved correctly from updated DB lines
            purchase_order_line_id:
              line.id || line.purchase_order_line_id || matchedDbLine?.id,
          };
        })
        .filter(
          (l: IncomingLine) =>
            Number(l.quantity) > 0 &&
            (l.line_type === "ITEM" || (!l.line_type && !!l.item_id)),
        );

      if (receiptLinesPayload.length) {
        // Calculate unreceived quantity remaining before attempting receipt
        const poLinesResult = await client.query(
          `SELECT id, quantity, COALESCE(received_quantity, 0) as received_quantity 
           FROM purchase_order_lines 
           WHERE purchase_order_id = $1 AND COALESCE(is_deleted, false) = false`,
          [id],
        );

        const hasUnreceivedItems = poLinesResult.rows.some((row) => {
          const remaining =
            Number(row.quantity) - Number(row.received_quantity || 0);
          return remaining > 0;
        });

        // 1. Structure payload for your existing PurchaseReceiptService

        if (hasUnreceivedItems) {
          const receiptPayload: PurchaseReceiptPayload = {
            receipt: {
              purchase_order_id: id,
              vendor_id: order.supplier_id,
              receipt_date:
                order.receipt_date || new Date().toISOString().split("T")[0],
              posting_date:
                order.posting_date || new Date().toISOString().split("T")[0],
              reference_no: order.reference,
              notes: order.notes,
            },
            lines: receiptLinesPayload.map(
              (line: IncomingLine, idx: number) => ({
                line_no: idx + 1,
                purchase_order_line_id: line.purchase_order_line_id,
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

          await PurchaseReceiptService.createTransactional(
            client,
            companyId,
            receiptPayload,
          );
        }
      }

      await PurchaseOrderService.recalculateStatus(client, id);
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Purchase order update transactional engine crash:", err);

    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to update purchase order pipeline";

    // Check for business validation errors and return 400 instead of 500
    if (errorMessage.includes("exceeds remaining open line quantity")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This order (or line) has already been fully received. Cannot receive additional stock.",
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
    const purchaseReceiptLineId = searchParams.get("purchaseReceiptLineId");

    // Pattern: Safe Line Deletion & Modification Hook
    if (purchaseReceiptLineId) {
      const result = await PurchaseReceiptService.safeDeleteReceiptLine(
        companyId,
        purchaseReceiptLineId,
      );
      return NextResponse.json({ success: true, data: result });
    }

    await PurchaseOrderService.delete(companyId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Purchase order delete error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete purchase order",
      },
      {
        status: 500,
      },
    );
  }
}
