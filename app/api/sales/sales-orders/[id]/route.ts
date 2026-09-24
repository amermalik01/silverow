// app/api/sales/sales-orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

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

    const data = await SalesOrderService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Sales order not found",
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
    console.error("Sales order get error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sales order",
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
    const { lines } = body;

    await client.query("BEGIN");

    // 1. Core update operation
    const dbLines = await SalesOrderService.update(client, companyId, id, body);

    // 2. Iterate safely using order indexes to map stock allocations accurately
    if (lines && Array.isArray(lines)) {
      for (let i = 0; i < lines.length; i++) {
        const payloadLine = lines[i];
        const matchedDbLine = dbLines[i];

        if (matchedDbLine && payloadLine.allocations) {
          await SalesOrderService.saveLineAllocations(
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
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Sales order update transactional engine crash:", err);

    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to update sales order pipeline";

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

    await SalesOrderService.delete(companyId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Sales order delete error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to delete sales order",
      },
      {
        status: 500,
      },
    );
  }
}
