// app/api/setup/warehouses/[id]/locations/route.ts

import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { apiHandler } from "@/lib/utils/apiHandler";
import { locationSchema } from "@/lib/validations/location.schema";
import {
  getWarehouseLocations,
  createWarehouseLocation,
} from "@/lib/services/warehouse.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;
    const locations = await getWarehouseLocations(id);
    return NextResponse.json(locations);
  });
}

export async function POST(
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
    const parsed = locationSchema.parse(body);

    const created = await createWarehouseLocation(
      id,
      companyId,
      parsed
    );
    return NextResponse.json(created);
  });
}

/* import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { locationSchema } from "@/lib/validations/location.schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const res = await pool.query(
    `
    SELECT * FROM warehouse_locations
    WHERE warehouse_id = $1
    ORDER BY parent_id NULLS FIRST
    `,
    [id],
  );

  return NextResponse.json(res.rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = locationSchema.parse(body);

  const companyId = session.user.company_id;

  const res = await pool.query(
    `
    INSERT INTO warehouse_locations (
      warehouse_id,
      company_id,
      parent_id,
      type,
      title,
      code,
      is_primary,
      address_line_1,
      address_line_2,
      city,
      county,
      postcode,
      country_id,
      latitude,
      longitude,
      capacity,
      capacity_uom_id,
      status
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
    )
    RETURNING *
    `,
    [
      id,
      companyId,
      parsed.parent_id || null,
      parsed.type,
      parsed.title,
      parsed.code || null,
      parsed.is_primary || false,
      parsed.address_line_1 || null,
      parsed.address_line_2 || null,
      parsed.city || null,
      parsed.county || null,
      parsed.postcode || null,
      parsed.country_id || null,
      parsed.latitude || null,
      parsed.longitude || null,
      parsed.capacity || 0,
      parsed.capacity_uom_id || null,
      parsed.status || 1,
    ],
  );

  return NextResponse.json(res.rows[0]);
} */
