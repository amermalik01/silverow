// app/api/finance/journals/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { JournalService } from "@/lib/services/journal.service";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      page = 1,
      pageSize = 50,
      source,
      status,
      filters,
      sortBy,
      sortOrder,
    } = body;

    // Call service layer with normalized parameters
    const result = await JournalService.list(companyId, {
      source,
      status: status || undefined,
      page: Number(page),
      limit: Number(pageSize),
      filters,
      sortBy,
      sortOrder,
    });

    // Remap response to match DataTable's required contract
    return NextResponse.json({
      data: result.rows,
      totalRecords: result.pagination.total,
    });
  } catch (err) {
    console.error("Journals Listing API Error:", err);
    return NextResponse.json(
      { error: "Failed to load journal records" },
      { status: 500 },
    );
  }
}
