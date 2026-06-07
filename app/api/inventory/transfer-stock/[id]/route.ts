// app/api/inventory/transfer-stock/[id]/route.ts

import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { CreateTransferDTO, TransferStockService } from "@/lib/services/inventory/transfer-stock.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Document ID parameter required." },
        { status: 400 },
      );
    }

    const documentRecord = await TransferStockService.getTransferById(
      companyId,
      id,
    );
    if (!documentRecord) {
      return NextResponse.json(
        { error: "Transfer document record not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: documentRecord },
      { status: 200 },
    );
  } catch (err) {
    const dbError = err as { message?: string };
    console.error("[TRANSFER_STOCK_GET_ERROR]", err);
    return NextResponse.json(
      {
        error: dbError.message || "Failed to retrieve transfer stock records.",
      },
      { status: 500 },
    );
  }
}


// Append this function into app/api/inventory/transfer-stock/[id]/route.ts

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID parameter required." }, { status: 400 });
    }

    const body: CreateTransferDTO = await request.json();

    if (!body.warehouseFromId || !body.warehouseToId || !body.lines?.length) {
      return NextResponse.json(
        { error: "Missing required core fields or lines data parameters." },
        { status: 400 },
      );
    }

    const updatedRecord = await TransferStockService.updateDraftTransfer(
      companyId,
      id,
      body
    );

    return NextResponse.json(
      { success: true, data: updatedRecord },
      { status: 200 }
    );
  } catch (err) {
    const dbError = err as { message?: string };
    console.error("[TRANSFER_STOCK_PUT_ERROR]", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to modify draft transfer statement records." },
      { status: 500 }
    );
  }
}