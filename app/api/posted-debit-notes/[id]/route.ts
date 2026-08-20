// app/api/posted-debit-notes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseInvoiceService } from "@/lib/services/purchase-invoices/purchase-invoice.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const invoiceData = await PurchaseInvoiceService.get(companyId, id);

    if (!invoiceData) {
      return NextResponse.json(
        { success: false, error: "Purchase invoice not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: invoiceData,
    });
  } catch (err) {
    console.error("[GET_PURCHASE_INVOICE_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch purchase invoice details." },
      { status: 500 },
    );
  }
}