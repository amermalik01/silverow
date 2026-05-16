// /api/shipment/picking/allocate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { InventoryAllocationEngineService } from "@/lib/services/inventory/inventory-allocation-engine.service";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { companyId, itemId, warehouseId, quantity, method } = body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const allocations = await InventoryAllocationEngineService.allocate(
      client,
      companyId,
      itemId,
      warehouseId,
      quantity,
      method || "FIFO",
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      allocations,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Allocation failed",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
