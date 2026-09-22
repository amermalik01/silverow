// app/api/sales/sales-orders/[id]/post-invoice/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesOrderPostingService } from "@/lib/services/sales/sales-order-posting.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface PostSalesOrderRequestBody {
  posting_date?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
  financials?: {
    amount: number;
    discount?: number;
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

    const body: PostSalesOrderRequestBody = await req.json().catch(() => ({}));

    const result = await SalesOrderPostingService.postSalesOrder({
      companyId,
      salesOrderId: id,
      userId,
      postingData: {
        posting_date: body.posting_date,
        notes: body.notes,
        currency_id: body.currency_id,
        exchange_rate: body.exchange_rate,
      },
      financials: body.financials,
    });

    return NextResponse.json({
      success: true,
      salesOrderId: result.id,
      salesOrderNo: result.sales_order_no,
      postedSalesInvoiceNo: result.posted_sales_invoice_no,
      journalId: result.journalId,
      message: "Sales order posted.",
    });
  } catch (err: unknown) {
    console.error("[SALES_ORDER_POST_FAILURE]:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to post sales order.",
      },
      { status: 500 },
    );
  }
}
