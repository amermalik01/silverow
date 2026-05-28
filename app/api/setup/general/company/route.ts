// app/api/setup/general/company/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT 
        id, name, slug, legal_name, tax_identifier, website, email, phone,
        address_line1, address_line2, city, state_province, postal_code, country_code,
        currency_id, inventory_system, plan, subscription_status
       FROM companies 
       WHERE id = $1`,
      [session.user.company_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Company entity profiles not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Company Settings GET Exception:", error);
    return NextResponse.json({ error: "Internal operational system failure" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized profile mutation" }, { status: 401 });
    }

    const b = await req.json();

    // Prevent direct execution manipulation of backend SaaS provisioning models via profile updates
    await pool.query(
      `UPDATE companies SET
        name = $1,
        legal_name = $2,
        tax_identifier = $3,
        website = $4,
        email = $5,
        phone = $6,
        address_line1 = $7,
        address_line2 = $8,
        city = $9,
        state_province = $10,
        postal_code = $11,
        country_code = $12,
        inventory_system = $13,
        updated_at = NOW()
       WHERE id = $14`,
      [
        b.name,
        b.legal_name || null,
        b.tax_identifier || null,
        b.website || null,
        b.email || null,
        b.phone || null,
        b.address_line1 || null,
        b.address_line2 || null,
        b.city || null,
        b.state_province || null,
        b.postal_code || null,
        b.country_code || 'USA',
        b.inventory_system || 'PERIODIC',
        session.user.company_id
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Company Settings PUT Exception:", error);
    return NextResponse.json({ error: "Failed to persist profile configuration updates" }, { status: 500 });
  }
}