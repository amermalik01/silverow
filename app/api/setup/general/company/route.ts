// app/api/setup/general/company/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Access Denied. Unauthorized Session Check." },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT 
        id, name, slug, legal_name, tax_identifier, website, email, phone, fax,
        address_line1, address_line2, city, state_province AS county, postal_code, 
        country_code, base_currency, logo_url, additional_printable_info,
        inventory_system, plan, subscription_status, max_users AS number_of_users,
        business_type, is_wholesaler, financial_year_start_date, financial_year_end_date,
        date_of_incorporation, company_reg_no, vat_scheme, vat_reg_no, vat_submission_freq
       FROM companies 
       WHERE id = $1`,
      [companyId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Company profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile: result.rows[0] });
  } catch (error) {
    console.error("Company Settings GET Exception:", error);
    return NextResponse.json(
      { error: "Internal operational system failure" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Access Denied. Unauthorized Session Check." },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Validation failed", details: { name: "Company name is required." } },
        { status: 400 }
      );
    }

    // Safely format country_code (max 3 chars or fallback)
    const rawCountry = body.country_code || body.country || "GB";
    const countryCode = rawCountry.trim().substring(0, 3).toUpperCase();

    // UPDATE ONLY General tab fields to prevent overwriting Financial settings
    await pool.query(
      `UPDATE companies SET
        name = $1,
        address_line1 = $2,
        address_line2 = $3,
        city = $4,
        state_province = $5,
        postal_code = $6,
        country_code = $7,
        phone = $8,
        fax = $9,
        additional_printable_info = $10,
        website = $11,
        base_currency = $12,
        logo_url = $13,
        updated_at = NOW()
       WHERE id = $14`,
      [
        body.name.trim(),
        body.address_line1 || null,
        body.address_line2 || null,
        body.city || null,
        body.county || body.state_province || null,
        body.postal_code || null,
        countryCode,
        body.phone || body.telephone || null,
        body.fax || null,
        body.additional_printable_info || null,
        body.website || body.web_address || null,
        body.base_currency || "GBP",
        body.logo_url || null,
        companyId,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "General company profile updated successfully.",
    });
  } catch (error) {
    console.error("Company Settings PUT Exception:", error);
    return NextResponse.json(
      { error: "Failed to persist profile configuration updates" },
      { status: 500 }
    );
  }
}
