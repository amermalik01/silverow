// /app/api/sales/sales-returns/sales-invoices/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Sales invoice ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const data = await SalesReturnService.getSalesInvoiceForReturn(
      companyId,
      id,
    );

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Sales invoice not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[GET_SALES_INVOICE_FOR_RETURN_ERROR]:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sales invoice.",
      },
      {
        status: 500,
      },
    );
  }
}
