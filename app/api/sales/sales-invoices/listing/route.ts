// /app/api/sales/sales-invoices/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { FetchParams } from "@/types/table";
import { SalesInvoiceService } from "@/lib/services/sales-invoices/sales-invoice.service";

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
    const result = await SalesInvoiceService.listPaginated(companyId, params);

    return NextResponse.json({
      data: result.data,
      totalRecords: result.totalRecords,
    });
  } catch (err) {
    console.error("Sales invoice list error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load sales invoices" },
      { status: 500 }
    );
  }
}