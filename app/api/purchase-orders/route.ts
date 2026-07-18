// app/api/purchase-orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await PurchaseOrderService.list(companyId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Purchase order list error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load purchase orders",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { lines } = body;

    await client.query("BEGIN");

    // 1. Create base document
    const createdOrder = await PurchaseOrderService.create(companyId, body);

    // 🌟 FIX: Add a runtime check to satisfy strict TypeScript constraints
    if (!createdOrder || !createdOrder.id) {
      throw new Error("Failed to generate a valid purchase order identification sequence.");
    }

    const purchaseOrderID: string = createdOrder.id;

    // 2. Fetch the newly created lines to extract their primary key IDs
    const savedLinesResult = await client.query(
      `SELECT id, item_id, warehouse_id, line_no FROM purchase_order_lines 
       WHERE purchase_order_id = $1 AND is_deleted = false ORDER BY line_no`,
      [purchaseOrderID],
    );

    // 3. Match payload lines to real database IDs and save allocations
    for (let i = 0; i < lines.length; i++) {
      const payloadLine = lines[i];
      const dbLine = savedLinesResult.rows[i];

      if (dbLine && payloadLine.allocations?.length > 0) {
        await PurchaseOrderService.saveLineAllocations(
          client,
          companyId,
          purchaseOrderID,
          dbLine.id,
          dbLine.item_id,
          dbLine.warehouse_id,
          payloadLine.allocations,
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, data: createdOrder },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Purchase order create error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to create purchase order",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const data = await PurchaseOrderService.create(companyId, body);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 201,
      },
    );
  } catch (err) {
    console.error("Purchase order create error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to create purchase order",
      },
      {
        status: 500,
      },
    );
  }
} */
