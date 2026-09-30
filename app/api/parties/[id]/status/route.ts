// app/api/parties/[id]/status/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type PartyStatus = "active" | "inactive";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json(
      { error: "Unauthorized operation." },
      { status: 401 },
    );
  }

  const { id: partyId } = await params;

  try {
    const body = await req.json();
    const status = body.status as PartyStatus;

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Expected active or inactive." },
        { status: 400 },
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingRes = await client.query(
        `SELECT id, name, status
         FROM parties
         WHERE id = $1
           AND company_id = $2
         FOR UPDATE`,
        [partyId, companyId],
      );

      if (existingRes.rows.length === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          { error: "Party record not found." },
          { status: 404 },
        );
      }

      const party = existingRes.rows[0];

      if (party.status === status) {
        await client.query("ROLLBACK");

        return NextResponse.json({
          message: `Party is already ${status}.`,
          party,
        });
      }

      const updateRes = await client.query(
        `UPDATE parties
         SET status = $1,
             updated_at = now()
         WHERE id = $2
           AND company_id = $3
         RETURNING *`,
        [status, partyId, companyId],
      );

      await client.query("COMMIT");

      return NextResponse.json({
        message: `Party status successfully changed to ${status}.`,
        party: updateRes.rows[0],
      });
    } catch (dbErr) {
      await client.query("ROLLBACK");

      console.error("Status Update Transaction Error:", dbErr);

      const err = dbErr as { message?: string };

      return NextResponse.json(
        {
          error: err.message || "Failed to update party status.",
        },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Status API Error:", err);

    return NextResponse.json(
      { error: "Malformed payload body." },
      { status: 400 },
    );
  }
}


