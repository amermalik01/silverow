// app/api/setup/warehouses/[id]/locations/[locId]/route.ts
import { pool } from "@/lib/db";
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
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import { apiHandler } from "@/lib/utils/apiHandler";


const updateLocationSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(["WAREHOUSE", "ZONE", "AISLE", "RACK", "SHELF", "BIN", "DEPOT"]).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  code: z.string().optional(),
  status: z.number().optional(),
});


export async function PUT(req: Request, params: Promise<{ id: string, locId: string }>) {
  return apiHandler(async () => {
    const { id: warehouse_id, locId } = await params;
    const body = await req.json();
    const data = updateLocationSchema.parse(body);

    // 🔒 Ensure location belongs to warehouse
    const check = await pool.query(
      `SELECT id FROM warehouse_locations WHERE id = $1 AND warehouse_id = $2`,
      [locId, warehouse_id]
    );

    if (check.rowCount === 0) {
      return NextResponse.json(
        { message: "Location not found in this warehouse" },
        { status: 404 }
      );
    }

    const res = await pool.query(
      `
      UPDATE warehouse_locations
      SET
        title = COALESCE($1, title),
        type = COALESCE($2, type),
        parent_id = COALESCE($3, parent_id),
        code = COALESCE($4, code),
        status = COALESCE($5, status),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [
        data.title ?? null,
        data.type ?? null,
        data.parent_id ?? null,
        data.code ?? null,
        data.status ?? null,
        locId,
      ]
    );

    return NextResponse.json(res.rows[0]);
  });
}


export async function DELETE(_: Request, params: Promise<{ id: string, locId: string }>) {
  return apiHandler(async () => {
    const { id: warehouse_id, locId } = await params;

    // 🔒 Check ownership
    const check = await pool.query(
      `SELECT is_primary FROM warehouse_locations WHERE id = $1 AND warehouse_id = $2`,
      [locId, warehouse_id]
    );

    if (check.rowCount === 0) {
      return NextResponse.json(
        { message: "Location not found" },
        { status: 404 }
      );
    }

    const isPrimary = check.rows[0].is_primary;

    if (isPrimary) {
      return NextResponse.json(
        { message: "Cannot delete primary location" },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM warehouse_locations WHERE id = $1`,
      [locId]
    );

    return NextResponse.json({ success: true });
  });
} */