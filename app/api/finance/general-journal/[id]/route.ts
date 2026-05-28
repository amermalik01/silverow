// app/api/finance/general-journal/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { JournalService } from "@/lib/services/journal.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await JournalService.get(companyId, id);

    if (!data)
      return NextResponse.json({ error: "Journal not found" }, { status: 404 });

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load journal" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const balancedPayload = {
      entry_date: body.entry_date,
      source: "GENERAL" as const,
      reference: body.reference,
      description: body.description,
      lines: body.lines, // Pass updated multi-rows directly
    };

    await JournalService.update(companyId, id, balancedPayload);
    return NextResponse.json({ success: true });
  } catch (err) {

    const dbError = err as { code?: string; message?: string };
    console.error(err);
    return NextResponse.json({ error: dbError.message || "Failed" }, { status: 500 });
  }
}

/* export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const amountNum = parseFloat(body.amount);

    const lines = [
      {
        account_id: body.account_id,
        debit: body.type === "PAYMENT" ? amountNum : 0,
        credit: body.type === "RECEIPT" ? amountNum : 0,
        description: body.description,
      },
      {
        account_id: "YOUR_SYSTEM_BANK_OR_CASH_ACCOUNT_ID",
        debit: body.type === "RECEIPT" ? 0 : amountNum,
        credit: body.type === "PAYMENT" ? 0 : amountNum,
        description: body.description,
      },
    ];

    // ✅ FIXED: Using upper-case "GENERAL" to match JournalSource type definitions
    const balancedPayload = {
      entry_date: body.entry_date,
      source: "GENERAL" as const,
      reference: body.reference,
      description: body.description,
      lines,
    };

    await JournalService.update(companyId, id, balancedPayload);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update journal",
      },
      { status: 500 },
    );
  }
} */
