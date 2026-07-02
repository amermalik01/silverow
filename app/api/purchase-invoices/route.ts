// app/api/purchase-invoices/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseInvoiceService } from "@/lib/services/purchase-invoices/purchase-invoice.service";

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Extract search matrix strings out of the incoming URL query payload
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const result = await PurchaseInvoiceService.list(companyId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      status,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("Purchase invoice list error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load purchase invoices",
      },
      {
        status: 500,
      },
    );
  }
}
