// app/api/setup/warehouses/[id]/locations/[locId]/route.ts

import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/utils/apiHandler";
import { locationSchema } from "@/lib/validations/location.schema";
import {
  updateWarehouseLocation,
  deleteWarehouseLocation,
} from "@/lib/services/warehouse.service";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; locId: string }> }
) {
  return apiHandler(async () => {
    const { id: warehouseId, locId } = await params;
    const body = await req.json();
    const parsed = locationSchema.partial().parse(body);

    const updated = await updateWarehouseLocation(locId, warehouseId, parsed);
    return NextResponse.json(updated);
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; locId: string }> }
) {
  return apiHandler(async () => {
    const { id: warehouseId, locId } = await params;
    await deleteWarehouseLocation(locId, warehouseId);
    return NextResponse.json({ success: true });
  });
}



/* import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { locationSchema } from "@/lib/validations/location.schema";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; locId: string  }> },
) {

  const { locId } = await params;

  const body = await req.json();
  const parsed = locationSchema.partial().parse(body);

  const fields = Object.keys(parsed);
  const values = Object.values(parsed);

  const setClause = fields
    .map((f, i) => `${f} = $${i + 1}`)
    .join(", ");

  const res = await pool.query(
    `
    UPDATE warehouse_locations
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${fields.length + 1}
    RETURNING *
    `,
    [...values, locId]
  );

  return NextResponse.json(res.rows[0]);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; locId: string  }> },
) {
  const { locId } = await params;

  await pool.query(
    `DELETE FROM warehouse_locations WHERE id = $1`,
    [locId]
  );

  return NextResponse.json({ success: true });
} */
