// app/api/finance/general-journal/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { JournalService } from "@/lib/services/journal.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);

    let status: "posted" | "unposted" | undefined = undefined;
    if (statusParam === "posted") status = "posted";
    if (statusParam === "unposted") status = "unposted";

    // Returns { rows, pagination }
    const result = await JournalService.list(companyId, {
      status,
      source: "GENERAL",
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json(); // Contains entry_date, reference, description, lines

    const balancedPayload = {
      entry_date: body.entry_date,
      source: "GENERAL" as const,
      reference: body.reference,
      description: body.description,
      lines: body.lines, // Pass array straight to service
    };

    const result = await JournalService.create(companyId, balancedPayload);
    return NextResponse.json(result);
  } catch (err) {

    const dbError = err as { code?: string; message?: string };
    console.error(err);
    return NextResponse.json({ error: dbError.message || "Failed" }, { status: 500 });
  }
}



/* export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as "posted" | "unposted" | null;

    // database text field query value can stay whatever your DB records expect
    const data = await JournalService.list(companyId, {
      status: status || undefined,
      source: "GENERAL",
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load journals" },
      { status: 500 },
    );
  }
} */

/* export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const amountNum = parseFloat(body.amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    const lines = [];

    if (body.type === "PAYMENT") {
      lines.push({
        account_id: body.account_id,
        debit: amountNum,
        credit: 0,
        description: body.description,
      });

      lines.push({
        account_id: "YOUR_SYSTEM_BANK_OR_CASH_ACCOUNT_ID",
        debit: 0,
        credit: amountNum,
        description: body.description,
      });
    } else {
      lines.push({
        account_id: body.account_id,
        debit: 0,
        credit: amountNum,
        description: body.description,
      });

      lines.push({
        account_id: "YOUR_SYSTEM_BANK_OR_CASH_ACCOUNT_ID",
        debit: amountNum,
        credit: 0,
        description: body.description,
      });
    }

    // ✅ FIXED: Using upper-case "GENERAL" to match JournalSource type definitions
    const balancedPayload = {
      entry_date: body.entry_date,
      source: "GENERAL" as const,
      reference: body.reference,
      description: body.description,
      lines: lines,
    };

    const result = await JournalService.create(companyId, balancedPayload);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create journal",
      },
      { status: 500 },
    );
  }
} */
