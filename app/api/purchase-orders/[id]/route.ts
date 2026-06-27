// app/api/purchase-orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";
import { InventoryAllocationEngineService } from "@/lib/services/inventory/inventory-allocation-engine.service";
import { PurchaseReceiptService } from "@/lib/services/purchase-receipts/purchase-receipt.service";

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
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const client = await pool.connect();

    const body = await req.json();
    const { order, lines } = body;

    // 1. Core transactional write to the database using your service wrapper
    const data = await PurchaseOrderService.update(companyId, id, body);

    // 2. Integration hook: If status has moved to a receipt stage, trigger downstream engines

    if (order?.status === "received") {
      // 1. Process physical incoming stock ledger rows
      await PurchaseReceiptService.create(id, lines);

      // 2. Loop through the received lines to run your strict transactional matching allocation engine
      // Note: Ensure your db layer exposes or accepts your PoolClient transaction handle if managing locks
      for (const line of lines) {
        if (line.quantity > 0) {
          await InventoryAllocationEngineService.allocate(
            client, // Pass your database PoolClient context here for 'FOR UPDATE' row locks
            companyId,
            line.item_id,
            line.warehouse_id,
            line.quantity,
            id, // outboundEntryId (or matching cross-reference context)
            line.id, // outboundLineId
            "FIFO", // Default matching method rule
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Purchase order update error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update purchase order",
      },
      {
        status: 500,
      },
    );
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

    await PurchaseOrderService.delete(companyId, id);

    return NextResponse.json({
      success: true,
    });
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

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";

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
    const data = await PurchaseOrderService.update(companyId, id, body);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Purchase order update error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update purchase order",
      },
      {
        status: 500,
      },
    );
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

    await PurchaseOrderService.delete(companyId, id);

    return NextResponse.json({
      success: true,
    });
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
} */
