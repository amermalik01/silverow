// app/api/purchase-receipts/[id]/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PurchaseReceiptPostingService } from "@/lib/services/purchase-receipts/purchase-receipt-posting.service";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: receiptId } = await params;

    // 1. Extract context headers for multi-tenant and audit separation
    const companyId = request.headers.get("x-company-id");
    const userId = request.headers.get("x-user-id") || undefined;

    if (!companyId) {
      return NextResponse.json(
        {
          error:
            "Bad Request: Missing identification scope context header (x-company-id).",
        },
        { status: 400 },
      );
    }

    if (!receiptId) {
      return NextResponse.json(
        {
          error:
            "Bad Request: Target purchase receipt identifier missing from path route execution.",
        },
        { status: 400 },
      );
    }

    // 2. Invoke the posting orchestration engine
    // This executes validations, moves inventory, posts to G/L, and updates PO status atomically.
    await PurchaseReceiptPostingService.post(companyId, receiptId, userId);

    return NextResponse.json(
      {
        success: true,
        message: `Purchase receipt document ${receiptId} posted successfully. General Ledger and stock profiles finalized.`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      `[PURCHASE_RECEIPT_POST_FAILURE] Errors occurred processing receipt posting execution:`,
      error,
    );

    // Handle specific relational control constraints gracefully
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Internal database operation failure.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
