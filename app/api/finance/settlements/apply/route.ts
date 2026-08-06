// app/api/finance/settlements/apply/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { AllocationService } from "@/lib/services/payments/allocation.service";

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { party_id, party_type, payment_ledger_id, allocations } = body;

    await client.query("BEGIN");

    if (party_type === "supplier") {
      await AllocationService.applyAP(
        client,
        companyId,
        payment_ledger_id,
        party_id,
        allocations,
      );
    } else {
      await AllocationService.applyAR(
        client,
        companyId,
        payment_ledger_id,
        party_id,
        allocations,
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
    
  } catch (err) {
    await client.query("ROLLBACK");

    const dbError = err as { code?: string; message?: string };

    return NextResponse.json(
      { error: dbError.message || "Failed to load supplier journals index" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
