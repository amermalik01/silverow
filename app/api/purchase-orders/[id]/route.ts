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
        lines: lines,
      };

      await PurchaseReceiptService.createTransactional(
        client,
        companyId,
        receiptPayload,
      );

      await PurchaseOrderService.recalculateStatus(client, id);
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Purchase order update transactional engine crash:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update purchase order pipeline",
      },
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


      /* for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const dbLineId = dbLines[i]?.id;

        if (dbLineId && Number(line.quantity) > 0) {
          await PurchaseOrderService.updateReceivedQuantity(
            client,
            dbLineId,
            Number(line.quantity),
          );

          await InventoryAllocationEngineService.allocate(
            client,
            companyId,
            line.item_id,
            line.warehouse_id,
            Number(line.quantity),
            id,
            dbLineId,
            "FIFO",
          );
        }
      } */