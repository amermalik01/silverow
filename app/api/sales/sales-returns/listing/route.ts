// app/api/sales/sales-returns/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";
import { FetchParams } from "@/types/table";

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
    const result = await SalesReturnService.listPaginated(companyId, params);

    return NextResponse.json({
      data: result.data,
      totalRecords: result.totalRecords,
    });
  } catch (err) {
    console.error("Sales Returns list error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load sales returns" },
      { status: 500 }
    );
  }
}