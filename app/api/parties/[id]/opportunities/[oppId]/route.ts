// app/api/opportunities/[oppId]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";


export async function PUT(
  req: Request,
  { params }: { params: Promise<{ oppId: string }> }
) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { oppId } = await params;

  try {
    const body = await req.json();
    const {
      name,
      approval_process,
      contact_person_1,
      role_1,
      contact_person_2,
      role_2,
      contact_person_3,
      role_3,
      forecast_amount,
      currency,
      converted_amount,
      frequency,
      probability,
      stage_start_date,
      estimated_stage_end_date,
      expected_close_date,
      salesperson,
      support_staff,
      notes,
      stage,
      status,
    } = body;

    const res = await pool.query(
      `UPDATE opportunities SET
        name = $1,
        approval_process = $2,
        contact_person_1 = $3,
        role_1 = $4,
        contact_person_2 = $5,
        role_2 = $6,
        contact_person_3 = $7,
        role_3 = $8,
        forecast_amount = $9,
        currency = $10,
        converted_amount = $11,
        frequency = $12,
        probability = $13,
        stage_start_date = $14,
        estimated_stage_end_date = $15,
        expected_close_date = $16,
        salesperson = $17,
        support_staff = $18,
        notes = $19,
        stage = $20,
        status = $21,
        updated_at = NOW()
       WHERE id = $22 AND company_id = $23
       RETURNING *`,
      [
        name,
        approval_process || null,
        contact_person_1 || null,
        role_1 || null,
        contact_person_2 || null,
        role_2 || null,
        contact_person_3 || null,
        role_3 || null,
        forecast_amount || 0,
        currency || "GBP",
        converted_amount || 0,
        frequency || "Monthly",
        probability || 10,
        stage_start_date || null,
        estimated_stage_end_date || null,
        expected_close_date || null,
        salesperson || null,
        support_staff || null,
        notes || null,
        stage || "Early Contact",
        status || "active",
        oppId,
        companyId,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Opportunity record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(res.rows[0]);
  } catch (err) {
    console.error("Update Opportunity Error:", err);
    return NextResponse.json(
      { error: "Failed to update opportunity." },
      { status: 500 }
    );
  }
}