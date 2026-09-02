// app/api/purchase-invoices/[id]/pdf/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseInvoiceService } from "@/lib/services/purchase-invoices/purchase-invoice.service";
import { JsReportService } from "@/lib/services/jsreport.service";

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

    // 1. Fetch domain data using existing service
    const invoiceData = await PurchaseInvoiceService.get(companyId, id);

    if (!invoiceData) {
      return NextResponse.json(
        { success: false, error: "Purchase invoice not found" },
        { status: 404 },
      );
    }

    // 2. Select JSReport template shortid based on company ID or invoice type
    // Replace with your actual template shortids configured in JSReport
    const templateShortId =
      process.env.JSREPORT_PURCHASE_INVOICE_TEMPLATE_ID || "r1gu5oJ13N";

    // 3. Render PDF via Generic JSReport Service
    const pdfBuffer = await JsReportService.renderPdf({
      templateShortId,
      data: invoiceData,
    });

    // 4. Return binary PDF stream inline for browser viewing / printing
    const filename = `PI_${invoiceData.invoice.invoice_no || id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET_PURCHASE_INVOICE_PDF_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate Purchase Invoice PDF." },
      { status: 500 },
    );
  }
}
