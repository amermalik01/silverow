// app/api/setup/general/company/addresses/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

// GET: Fetch all additional addresses for current company
export async function GET() {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const result = await pool.query(
      `SELECT 
        id,
        name,
        address_line1,
        address_line2,
        city,
        county,
        postal_code,
        country_code,
        contact_person,
        job_title,
        mobile,
        telephone,
        fax,
        email
       FROM company_addresses 
       WHERE company_id = $1 
       ORDER BY created_at DESC`,
      [companyId],
    );

    return NextResponse.json({ addresses: result.rows });
  } catch (error) {
    console.error("Company Address GET Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve company addresses" },
      { status: 500 },
    );
  }
}

// POST: Create a new address entry
export async function POST(req: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Address name/label is required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO company_addresses (
        company_id,
        name,
        address_line1,
        address_line2,
        city,
        county,
        postal_code,
        country_code,
        contact_person,
        job_title,
        mobile,
        telephone,
        fax,
        email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        companyId,
        body.name.trim(),
        body.address_line1 || null,
        body.address_line2 || null,
        body.city || null,
        body.county || null,
        body.postal_code || null,
        body.country_code || "United Kingdom",
        body.contact_person || null,
        body.job_title || null,
        body.mobile || null,
        body.telephone || null,
        body.fax || null,
        body.email || null,
      ],
    );

    return NextResponse.json({
      success: true,
      address: result.rows[0],
      message: "Address added successfully",
    });
  } catch (error) {
    console.error("Company Address POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create company address" },
      { status: 500 },
    );
  }
}

// PUT: Update an existing address entry
export async function PUT(req: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 },
      );
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Address name/label is required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE company_addresses SET
        name = $1,
        address_line1 = $2,
        address_line2 = $3,
        city = $4,
        county = $5,
        postal_code = $6,
        country_code = $7,
        contact_person = $8,
        job_title = $9,
        mobile = $10,
        telephone = $11,
        fax = $12,
        email = $13,
        updated_at = NOW()
       WHERE id = $14 AND company_id = $15
       RETURNING *`,
      [
        body.name.trim(),
        body.address_line1 || null,
        body.address_line2 || null,
        body.city || null,
        body.county || null,
        body.postal_code || null,
        body.country_code || "United Kingdom",
        body.contact_person || null,
        body.job_title || null,
        body.mobile || null,
        body.telephone || null,
        body.fax || null,
        body.email || null,
        body.id,
        companyId,
      ],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Address not found or permission denied" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      address: result.rows[0],
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Company Address PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update company address" },
      { status: 500 },
    );
  }
}

// DELETE: Delete an address by ID
export async function DELETE(req: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const addressId = searchParams.get("id");

    if (!addressId) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `DELETE FROM company_addresses WHERE id = $1 AND company_id = $2 RETURNING id`,
      [addressId, companyId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Address not found or permission denied" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Address removed successfully",
    });
  } catch (error) {
    console.error("Company Address DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to delete company address" },
      { status: 500 },
    );
  }
}
