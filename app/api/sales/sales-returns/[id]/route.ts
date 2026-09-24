// app/api/sales/sales-returns/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

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

    const data = await SalesReturnService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Sales return not found",
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
    console.error("Sales return get error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sales return",
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
    const dbLines = await SalesReturnService.update(
      client,
      companyId,
      id,
      body,
    );

    // 2. Iterate safely using line order indexes to sync stock allocations
    if (lines && Array.isArray(lines)) {
      for (let i = 0; i < lines.length; i++) {
        const payloadLine = lines[i];
        const matchedDbLine = dbLines[i];

        if (matchedDbLine && payloadLine.allocations) {
          await SalesReturnService.saveLineAllocations(
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
    console.error("Sales return update transactional engine crash:", err);

    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to update sales return pipeline";

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

    await SalesReturnService.delete(companyId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Sales return delete error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to delete sales return",
      },
      {
        status: 500,
      },
    );
  }
}
