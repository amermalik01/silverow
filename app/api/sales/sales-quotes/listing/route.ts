// app/api/sales/sales-quotes/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { FetchParams } from "@/types/table";
import { SalesQuoteService } from "@/lib/services/sales/sales-quote.service";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params: FetchParams = await req.json();
    const result = await SalesQuoteService.listPaginated(companyId, params);

    return NextResponse.json({
      data: result.data,
      totalRecords: result.totalRecords,
    });
  } catch (err) {
    console.error("Sales quotes list error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load sales quotes" },
      { status: 500 }
    );
  }
}