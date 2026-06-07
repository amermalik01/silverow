// app/api/inventory/transfer-stock/[id]/post/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { TransferStockService } from "@/lib/services/inventory/transfer-stock.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await getServerSession(authOptions);
  const userId = session?.user.id;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Stock transfer verification ID parameter required." },
        { status: 400 },
      );
    }

    // Process actual ledger balance deduction modifications across warehouses safely
    const executionResult = await TransferStockService.postTransfer(
      companyId,
      id,
      userId,
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Stock Transfer posted successfully. Quantities have been moved.",
        data: executionResult,
      },
      { status: 200 },
    );
  } catch (err) {
    const dbError = err as { message?: string };
    console.error("[TRANSFER_STOCK_POSTING_EXECUTION_ERROR]", err);
    return NextResponse.json(
      {
        error:
          dbError.message || "Ledger transaction processing execution aborted.",
      },
      { status: 500 },
    );
  }
}
