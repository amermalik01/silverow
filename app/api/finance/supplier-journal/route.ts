// /app/api/finance/supplier-journal/route.ts

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

    let status: "posted" | "unposted" | undefined = undefined;
    if (statusParam === "posted") status = "posted";
    if (statusParam === "unposted") status = "unposted";

    // Read paginated values using the discriminator source key "SUPPLIER_JOURNAL"
    // Inside the service layer, this cleanly maps to database enum column 'PAYMENT'
    const result = await JournalService.list(companyId, {
      status,
      source: "SUPPLIER_JOURNAL",
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Supplier Journal List Error:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to load supplier journals index" },
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
      source: "SUPPLIER_JOURNAL" as const, // Triggers "supplier_journal" sequence rules (Prefix: SJ)
      reference: body.reference || null,
      description: body.description || null,
      lines: body.lines || [], // Handles multiple rows balancing debts/credits dynamically from UI form
    };

    const result = await JournalService.create(companyId, balancedPayload);
    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Supplier Journal Create Error:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to save supplier journal voucher" },
      { status: 500 },
    );
  }
}
