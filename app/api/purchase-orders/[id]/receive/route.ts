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
  currency_id?: string;
  exchange_rate?: number;
}

interface RequestBody {
  order: IncomingOrder;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    const userId = req.headers.get("x-user-id") || undefined;
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
          // error: "No unfulfilled line quantities available to receive on this order.",
          error: "No Stock available to receive",
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
        currency_id: order.currency_id,
        exchange_rate: order.exchange_rate,
        userId,
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