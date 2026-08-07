// /app/api/finance/customer-journal/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { JournalService } from "@/lib/services/journal.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);

    // Filter validation matching unified status tabs logic
    let status: "posted" | "unposted" | undefined = undefined;
    if (statusParam === "posted") status = "posted";
    if (statusParam === "unposted") status = "unposted";

    // Read paginated set using source ledger discriminator "CUSTOMER_JOURNAL"
    const result = await JournalService.list(companyId, {
      status,
      source: "CUSTOMER_JOURNAL",
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Customer Journal List Exception:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to load customer journals index" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const balancedPayload = {
      entry_date: body.entry_date,
      source: "CUSTOMER_JOURNAL" as const,
      reference: body.reference,
      description: body.description,
      lines: body.lines,
    };

    const result = await JournalService.create(companyId, balancedPayload);
    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Customer Journal Create Error:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to save customer journal voucher" },
      { status: 500 },
    );
  }
}
