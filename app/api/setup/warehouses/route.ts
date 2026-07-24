// app/api/setup/warehouses/route.ts

import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { apiHandler } from "@/lib/utils/apiHandler";
import { warehouseSchema } from "@/lib/validations/warehouse.schema";
import {
  createWarehouse,
  getAllWarehouses,
} from "@/lib/services/warehouse.service";

export async function GET() {
  return apiHandler(async () => {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await getAllWarehouses(companyId);
    return NextResponse.json(data);
  });
}

export async function POST(req: Request) {
  return apiHandler(async () => {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = warehouseSchema.parse(body);

    const result = await createWarehouse(companyId, parsed);
    return NextResponse.json(result);
  });
}

/* import { NextResponse } from "next/server";
import { createWarehouse } from "@/lib/services/warehouse.service";
import { warehouseSchema } from "@/lib/validations/warehouse.schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.company_id;
    
    const body = await req.json();
    const parsed = warehouseSchema.parse(body);

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await createWarehouse({
      ...parsed,
      company_id: companyId,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT w.*, l.title as primary_location_name
      FROM warehouses w
      LEFT JOIN warehouse_locations l
      ON w.primary_location_id = l.id
      ORDER BY w.created_at DESC
    `);

    return NextResponse.json(res.rows);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 },
    );
  }
} */
