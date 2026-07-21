// app/api/parties/[id]/opportunities/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: partyId } = await params;

  try {
    const res = await pool.query(
      `SELECT * FROM opportunities 
       WHERE party_id = $1 AND company_id = $2 
       ORDER BY created_at DESC`,
      [partyId, companyId],
    );

    return NextResponse.json(res.rows);
  } catch (err) {
    console.error("Fetch Opportunities Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve opportunities." },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: partyId } = await params;

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
      created_by,
    } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Opportunity Name is required." },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Generate Auto Sequence Opp No (e.g. OPP0001)
      const seqRes = await client.query(
        "SELECT get_next_sequence($1, 'opportunity') AS code",
        [companyId],
      );
      const oppNo = seqRes.rows[0]?.code || `OPP-${Date.now()}`;

      const insertRes = await client.query(
        `INSERT INTO opportunities (
          company_id, party_id, opp_no, name, approval_process,
          contact_person_1, role_1, contact_person_2, role_2, contact_person_3, role_3,
          forecast_amount, currency, converted_amount, frequency, probability,
          stage_start_date, estimated_stage_end_date, expected_close_date,
          salesperson, support_staff, notes, stage, status, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19,
          $20, $21, $22, $23, $24, $25
        ) RETURNING *`,
        [
          companyId,
          partyId,
          oppNo,
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
          converted_amount || forecast_amount || 0,
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
          created_by || "Super Admin",
        ],
      );

      await client.query("COMMIT");
      return NextResponse.json(insertRes.rows[0], { status: 201 });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Create Opportunity Error:", err);
    return NextResponse.json(
      { error: "Failed to persist opportunity record." },
      { status: 500 },
    );
  }
}
