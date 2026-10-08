// app/api/parties/[id]/ledger/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: partyId } = await params;
    const body = await req.json();
    const { entryId, partyType, onHold, reason } = body;

    if (!entryId) {
      return NextResponse.json(
        { error: "Missing required entryId parameter." },
        { status: 400 }
      );
    }

    const isSupplier = (partyType || "supplier").toLowerCase() === "supplier";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    await pool.query(
      `UPDATE ${tableName} 
       SET on_hold = $1, on_hold_reason = $2 
       WHERE id = $3 AND ${partyColumn} = $4 AND company_id = $5`,
      [Boolean(onHold), reason || "", entryId, partyId, companyId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Update failed." },
      { status: 500 }
    );
  }
}
