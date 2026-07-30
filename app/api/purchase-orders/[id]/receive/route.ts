// app/api/purchase-orders/[id]/receive/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseReceiptService } from "@/lib/services/purchase-receipts/purchase-receipt.service";
import { InventoryAllocationEngineService } from "@/lib/services/inventory/inventory-allocation-engine.service";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";
import { PurchaseReceiptPayload } from "@/types/purchase-receipt";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface IncomingOrder {
  supplier_id: string;
  receipt_date?: string;
  posting_date?: string;
  reference?: string;
  notes?: string;
}

interface IncomingLine {
  id?: string;
  purchase_order_line_id?: string;
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
  order: IncomingOrder;
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

    // Typed destructuring
    const body: RequestBody = await req.json();
    const { order, lines = [] } = body;

    // Filter down using strongly-typed line parameters
    const validLines = lines.filter(
      (l: IncomingLine) => Number(l.quantity) > 0,
    );

    if (!validLines.length) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid line quantities provided to receive.",
        },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    // 1. Structure payload for your existing PurchaseReceiptService
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
      lines: validLines.map((line: IncomingLine, idx: number) => ({
        line_no: idx + 1,
        purchase_order_line_id: line.id || line.purchase_order_line_id,
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

    // 2. Execute Purchase Receipt (Handles GRNI, GL Journal, and Inventory Layer Creation)
    const receipt = await PurchaseReceiptService.createTransactional(
      client,
      companyId,
      receiptPayload,
    );

    // 3. Process Inventory Allocations for FIFO matching
    for (const line of validLines) {
      const lineId = line.id || line.purchase_order_line_id;

      if (lineId) {
        await InventoryAllocationEngineService.allocate(
          client,
          companyId,
          line.item_id,
          line.warehouse_id,
          Number(line.quantity),
          id,
          lineId,
          "FIFO",
        );
      }
    }

    // 4. Recalculate Purchase Order status dynamically
    await PurchaseOrderService.recalculateStatus(client, id);

    await client.query("COMMIT");
    return NextResponse.json({ success: true, receiptId: receipt.id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Stock receive error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to receive stock",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
