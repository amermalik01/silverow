// app/api/parties/[id]/allocate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { AllocationService } from "@/lib/services/payments/allocation.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: partyId } = await params;
    const body = await req.json();

    const {
      paymentLedgerId,
      partyType = "supplier",
      allocations = [],
      userId,
    } = body;

    if (
      !paymentLedgerId ||
      !Array.isArray(allocations) ||
      allocations.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid allocation payload." },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const isSupplier = partyType.toLowerCase() === "supplier";

    if (isSupplier) {
      await AllocationService.applyAP(
        client,
        companyId,
        paymentLedgerId,
        partyId,
        allocations,
        userId,
      );
    } else {
      await AllocationService.applyAR(
        client,
        companyId,
        paymentLedgerId,
        partyId,
        allocations,
        userId,
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Allocation failed" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
