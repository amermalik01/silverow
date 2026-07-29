// app/api/setup/general/financial/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Access Denied. Unauthorized Session Check." },
        { status: 401 },
      );
    }

    const result = await pool.query(
      `SELECT 
        business_type,
        is_wholesaler,
        TO_CHAR(financial_year_start_date, 'YYYY-MM-DD') AS financial_year_start_date,
        TO_CHAR(financial_year_end_date, 'YYYY-MM-DD') AS financial_year_end_date,
        TO_CHAR(date_of_incorporation, 'YYYY-MM-DD') AS date_of_incorporation,
        company_reg_no,
        vat_scheme,
        vat_reg_no,
        vat_submission_freq
       FROM companies 
       WHERE id = $1`,
      [companyId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Financial settings profile not found" },
        { status: 404 },
      );
    }

    const row = result.rows[0];

    // Return sanitized JSON matching FinancialSettingsData interface
    return NextResponse.json({
      business_type: row.business_type || "limited_company",
      is_wholesaler: Boolean(row.is_wholesaler),
      financial_year_start_date: row.financial_year_start_date || "",
      financial_year_end_date: row.financial_year_end_date || "",
      date_of_incorporation: row.date_of_incorporation || "",
      company_reg_no: row.company_reg_no || "",
      vat_scheme: row.vat_scheme || "no_vat",
      vat_reg_no: row.vat_reg_no || "",
      vat_submission_freq: row.vat_submission_freq || "",
    });
  } catch (error) {
    console.error("Financial Settings GET Error:", error);
    return NextResponse.json(
      { error: "Internal operational system failure" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Access Denied. Unauthorized Session Check." },
        { status: 401 },
      );
    }

    const body = await req.json();

    // Validations
    const errors: Record<string, string> = {};

    if (!body.business_type) {
      errors.business_type = "Business Type is required.";
    }

    if (body.financial_year_start_date && body.financial_year_end_date) {
      const start = new Date(body.financial_year_start_date);
      const end = new Date(body.financial_year_end_date);

      if (end <= start) {
        errors.financial_year_end_date = "End date must be after start date.";
      }
    }

    if (body.date_of_incorporation) {
      const incDate = new Date(body.date_of_incorporation);
      if (incDate > new Date()) {
        errors.date_of_incorporation =
          "Date of incorporation cannot be in the future.";
      }
    }

    if (
      body.vat_scheme === "standard" &&
      (!body.vat_reg_no || !body.vat_reg_no.trim())
    ) {
      errors.vat_reg_no = "VAT Reg. No. is required for Standard scheme.";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    // Auto-clear VAT inputs if scheme is 'no_vat'
    const isNoVat = body.vat_scheme === "no_vat" || !body.vat_scheme;
    const vatRegNo = isNoVat ? null : body.vat_reg_no?.trim() || null;
    const vatSubmissionFreq = isNoVat ? null : body.vat_submission_freq || null;

    await pool.query(
      `UPDATE companies SET
        business_type = $1,
        is_wholesaler = $2,
        financial_year_start_date = $3,
        financial_year_end_date = $4,
        date_of_incorporation = $5,
        company_reg_no = $6,
        vat_scheme = $7,
        vat_reg_no = $8,
        vat_submission_freq = $9,
        updated_at = NOW()
       WHERE id = $10`,
      [
        body.business_type || "limited_company",
        body.is_wholesaler ?? false,
        body.financial_year_start_date || null,
        body.financial_year_end_date || null,
        body.date_of_incorporation || null,
        body.company_reg_no?.trim() || null,
        body.vat_scheme || "no_vat",
        vatRegNo,
        vatSubmissionFreq,
        companyId,
      ],
    );

    return NextResponse.json({
      success: true,
      message: "Financial settings saved successfully.",
    });
  } catch (error) {
    console.error("Financial Settings PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to persist financial configuration updates" },
      { status: 500 },
    );
  }
}
