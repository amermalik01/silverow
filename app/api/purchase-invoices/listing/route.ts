// app/api/purchase-invoices/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseInvoiceService } from "@/lib/services/purchase-invoices/purchase-invoice.service";
import { FetchParams } from "@/types/table";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: FetchParams = await req.json();
    const result = await PurchaseInvoiceService.listPaginated(companyId, body);

    return NextResponse.json({
      success: true,
      data: result.data,
      totalRecords: result.totalRecords,
    });
  } catch (err) {
    console.error("[PURCHASE_INVOICE_LISTING_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load purchase invoices." },
      { status: 500 },
    );
  }
}
