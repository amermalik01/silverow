// app/api/purchase-orders/suppliers/[supplierId]/locations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { supplierId } = await params;

    if (!supplierId) {
      return NextResponse.json(
        { error: "Supplier ID is required" },
        { status: 400 },
      );
    }

    // Verify supplier belongs to company and is a valid supplier
    const supplierCheck = await pool.query(
      `SELECT id FROM parties WHERE id = $1 AND company_id = $2 AND is_supplier = true`,
      [supplierId, companyId],
    );

    if (supplierCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Supplier not found or unauthorized" },
        { status: 404 },
      );
    }

    // Query all shipping or primary addresses associated with the supplier
    const queryText = `
      SELECT 
        pa.id,
        pa.label AS location_code,
        COALESCE(pa.label, 'Location ' || pa.id) AS name,
        pa.address_1,
        pa.address_2,
        pa.city,
        pa.state AS county,
        pa.postcode,
        COALESCE(c.name, pa.country) AS country,
        pa.phone,
        pa.email,
        pa.is_primary,
        pa.is_shipping,
        pa.is_billing
      FROM party_addresses pa
      LEFT JOIN country c 
        ON pa.country = c.id::text OR pa.country = c.iso
      WHERE pa.party_id = $1
        AND (pa.is_shipping = true OR pa.is_primary = true)
      ORDER BY pa.is_shipping DESC, pa.is_primary DESC, pa.created_at ASC;
    `;

    const result = await pool.query(queryText, [supplierId]);

    return NextResponse.json({
      data: result.rows,
    });
  } catch (err) {
    console.error("Error fetching supplier shipping locations:", err);
    return NextResponse.json(
      { error: "Failed to fetch supplier locations" },
      { status: 500 },
    );
  }
}
