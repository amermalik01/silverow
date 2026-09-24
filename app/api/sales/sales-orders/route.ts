// app/api/sales/sales-orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await SalesOrderService.list(companyId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Sales order list error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sales orders",
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
    const createdOrder = await SalesOrderService.create(companyId, body);

    if (!createdOrder || !createdOrder.id) {
      throw new Error(
        "Failed to generate a valid sales order identification sequence.",
      );
    }

    const salesOrderID: string = createdOrder.id;

    // 2. Fetch newly created lines to extract their primary key IDs
    const savedLinesResult = await client.query(
      `SELECT id, item_id, warehouse_id, line_no FROM sales_order_lines 
       WHERE sales_order_id = $1 AND is_deleted = false ORDER BY line_no`,
      [salesOrderID],
    );

    // 3. Match payload lines to real database IDs and save allocations
    if (lines && Array.isArray(lines)) {
      for (let i = 0; i < lines.length; i++) {
        const payloadLine = lines[i];
        const dbLine = savedLinesResult.rows[i];

        if (dbLine && payloadLine.allocations?.length > 0) {
          await SalesOrderService.saveLineAllocations(
            client,
            companyId,
            salesOrderID,
            dbLine.id,
            dbLine.item_id,
            dbLine.warehouse_id,
            payloadLine.allocations,
          );
        }
      }
    }

    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, data: createdOrder },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Sales order create error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to create sales order",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
