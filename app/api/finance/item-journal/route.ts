// /app/api/finance/item-journal/route.ts

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

    // Read paginated items matching the direct enum flag "ITEM_JOURNAL"
    const result = await JournalService.list(companyId, {
      status,
      source: "ITEM_JOURNAL",
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Item Journal Index View Exception:", err);
    return NextResponse.json(
      {
        error: dbError.message || "Failed to load item journals catalog index",
      },
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
      source: "ITEM_JOURNAL" as const, // Triggers sequence mappings for item_journal prefix numbers
      reference: body.reference,
      description: body.description,
      lines: body.lines, // Array contains item_id links mapping straight to your rows matrix
    };

    const result = await JournalService.create(companyId, balancedPayload);
    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Item Journal Construction Execution Failure:", err);
    return NextResponse.json(
      {
        error:
          dbError.message ||
          "Failed to create inventory entry adjustment record",
      },
      { status: 500 },
    );
  }
}
