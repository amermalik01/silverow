// app/api/purchase-orders/[id]/post-invoice/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseInvoicePostingService } from "@/lib/services/purchase-invoices/purchase-invoice-posting.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface PostInvoiceRequestBody {
  supplier_invoice_no: string;
  invoice_date?: string;
  due_date?: string;
  posting_date?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
  financials: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;
    const userId = req.headers.get("x-user-id") || undefined;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: PostInvoiceRequestBody = await req.json();

    if (!body.supplier_invoice_no) {
      return NextResponse.json(
        { success: false, error: "Supplier Invoice Number is required." },
        { status: 400 },
      );
    }

    const result = await PurchaseInvoicePostingService.postInvoice({
      companyId,
      purchaseOrderId: id,
      userId,
      invoiceData: {
        supplier_invoice_no: body.supplier_invoice_no,
        invoice_date: body.invoice_date,
        due_date: body.due_date,
        posting_date: body.posting_date,
        notes: body.notes,
        currency_id: body.currency_id,
        exchange_rate: body.exchange_rate,
      },
      financials: body.financials,
    });

    return NextResponse.json({
      success: true,
      invoiceId: result.id,
      invoiceNo: result.invoice_no,
      message: "Purchase invoice posted cleanly to Accounts Payable.",
    });
  } catch (err: unknown) {
    console.error("[PURCHASE_INVOICE_POST_FAILURE]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to post invoice.",
      },
      { status: 500 },
    );
  }
}
