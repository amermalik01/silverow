// app/api/inventory/transfer-stock/route.ts

import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import {
  CreateTransferDTO,
  TransferStockService,
} from "@/lib/services/inventory/transfer-stock.service";

/**
 * Fetch a Paginated List of Stock Transfers filtered by matching Status
 */
export async function GET(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "unposted") as "all" | "posted" | "unposted";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10));

    const result = await TransferStockService.getPaginatedTransfers(companyId, {
      status,
      page,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const dbError = err as { message?: string };
    console.error("[TRANSFER_STOCK_LIST_GET_ERROR]", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to load stock transfer listing entries." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: CreateTransferDTO = await request.json();

    if (!body.warehouseFromId || !body.warehouseToId || !body.lines?.length) {
      return NextResponse.json(
        { error: "Missing required core fields or lines data parameters." },
        { status: 400 },
      );
    }

    // Creates an unposted draft transaction framework configuration
    const draftRecord = await TransferStockService.createDraftTransfer(
      companyId,
      body,
    );

    return NextResponse.json(
      { success: true, data: draftRecord },
      { status: 201 },
    );
  } catch (err) {
    const dbError = err as { message?: string };
    console.error("[TRANSFER_STOCK_DRAFT_POST_ERROR]", err);
    return NextResponse.json(
      {
        error:
          dbError.message ||
          "Internal draft initialization processing failure.",
      },
      { status: 500 },
    );
  }
}
