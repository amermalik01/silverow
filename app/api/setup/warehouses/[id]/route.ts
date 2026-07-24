// app/api/setup/warehouses/[id]/route.ts

import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { apiHandler } from "@/lib/utils/apiHandler";
import {
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
} from "@/lib/services/warehouse.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const warehouse = await getWarehouseById(id, companyId);

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    return NextResponse.json(warehouse);
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await updateWarehouse(id, companyId, body);
    return NextResponse.json(updated);
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    await deleteWarehouse(id, companyId);

    return NextResponse.json({ success: true });
  });
}

/* import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Console } from "console";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const res = await pool.query(`SELECT * FROM warehouses WHERE id = $1`, [id]);

  return NextResponse.json(res.rows[0]);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const warehouse = body.warehouse;

  if (!warehouse?.name) {
    return NextResponse.json(
      { error: "Warehouse name is required" },
      { status: 400 },
    );
  }

  if (warehouse.primary_location_id) {
    const check = await pool.query(
      `SELECT 1 FROM warehouse_locations WHERE id=$1 AND warehouse_id=$2`,
      [warehouse.primary_location_id, id],
    );

    if (check.rowCount === 0) {
      return NextResponse.json(
        { error: "Primary location must belong to same warehouse" },
        { status: 400 },
      );
    }
  }

  const res = await pool.query(
    `
    UPDATE warehouses
    SET
      name = $1,
      type = $2,
      status = $3,
      currency_id = $4,
      storage_type_id = $5,
      primary_location_id = $6,
      updated_at = NOW()
    WHERE id = $7
    RETURNING *
    `,
    [
      warehouse.name,
      warehouse.type,
      warehouse.status,
      warehouse.currency_id || null,
      warehouse.storage_type_id || null,
      warehouse.primary_location_id || null,
      id,
    ],
  );

  return NextResponse.json(res.rows[0]);
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await pool.query(`DELETE FROM warehouses WHERE id=$1`, [id]);

  return NextResponse.json({ success: true });
} */
