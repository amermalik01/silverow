// app/api/purchase-orders/[id]/receive/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseReceiptService } from "@/lib/services/purchase-receipts/purchase-receipt.service";
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

interface RequestBody {
  order: IncomingOrder;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
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

    const body: RequestBody = await req.json();
    const { order } = body;

    await client.query("BEGIN");

    // 1. Fetch persistent Purchase Order Lines directly from DB with row locks
    const poLinesResult = await client.query(
      `
      SELECT 
        id,
        line_no,
        item_id,
        warehouse_id,
        quantity,
        received_quantity,
        unit_cost,
        discount_amount,
        line_type
      FROM purchase_order_lines
      WHERE purchase_order_id = $1
        AND company_id = $2
        AND COALESCE(is_deleted, false) = false
        AND (line_type = 'ITEM' OR (line_type IS NULL AND item_id IS NOT NULL))
      FOR UPDATE
      `,
      [id, companyId]
    );

    const dbLines = poLinesResult.rows;

    // 2. Filter for lines that still have remaining quantities to receive
    const unfulfilledLines = dbLines.filter((l) => {
      const qty = Number(l.quantity || 0);
      const rec = Number(l.received_quantity || 0);
      return qty - rec > 0;
    });

    if (!unfulfilledLines.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          success: false,
          error: "No unfulfilled line quantities available to receive on this order.",
        },
        { status: 400 }
      );
    }

    // 3. Map database lines to the PurchaseReceiptPayload format
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
      lines: unfulfilledLines.map((line, idx) => {
        const remainingQty =
          Number(line.quantity || 0) - Number(line.received_quantity || 0);
        const rawCost = Number(line.unit_cost || 0);
        const totalLineQty = Number(line.quantity || 1);
        const totalDiscount = Number(line.discount_amount || 0);

        // Pro-rate discount for remaining quantities
        const discountPerUnit = totalDiscount / totalLineQty;
        const netUnitCost = rawCost - discountPerUnit;

        return {
          line_no: idx + 1,
          purchase_order_line_id: line.id, // Persisted DB UUID guaranteed
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: remainingQty,
          unit_cost: netUnitCost,
        };
      }),
    };

    // 4. Process receipt, GL postings, GRNI entries, and inventory layers
    const receipt = await PurchaseReceiptService.createTransactional(
      client,
      companyId,
      receiptPayload
    );

    // 5. Recalculate status and commit
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
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseReceiptService } from "@/lib/services/purchase-receipts/purchase-receipt.service";
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
  discount_amount?: number | string;
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
    // const validLines = lines.filter(
    //   (l: IncomingLine) => Number(l.quantity) > 0,
    // );

    const validLines = lines.filter(
      (l: IncomingLine) =>
        Number(l.quantity) > 0 &&
        (l.line_type === "ITEM" || (!l.line_type && !!l.item_id)),
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
      lines: validLines.map((line: IncomingLine, idx: number) => {
        const qty = Number(line.quantity || 0);
        const rawCost = Number(line.unit_price || line.unit_cost || 0);
        const discount = Number(line.discount_amount || 0);

        // Calculate net unit cost taking line discounts into account
        const netTotalCost = qty * rawCost - discount;
        const netUnitCost = qty > 0 ? netTotalCost / qty : rawCost;

        return {
          line_no: idx + 1,
          purchase_order_line_id: line.id || line.purchase_order_line_id,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          location_id: line.location_id,
          bin_code: line.bin_code,
          batch_no: line.batch_no,
          serial_no: line.serial_no,
          expiry_date: line.expiry_date,
          quantity: qty,
          unit_cost: netUnitCost, // Net of discount
        };
      }),
    };

    // 2. Execute Purchase Receipt (Handles GRNI, GL Journal, and Inventory Layer Creation)
    const receipt = await PurchaseReceiptService.createTransactional(
      client,
      companyId,
      receiptPayload,
    );

    // 3. Recalculate Purchase Order status dynamically
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
} */
