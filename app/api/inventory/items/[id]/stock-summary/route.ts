// app/api/inventory/items/[id]/stock-summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ItemActivityService } from "@/lib/services/inventory/item-activity.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext,
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const summary = await ItemActivityService.getStockSummary(
      companyId,
      itemId,
    );

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 },
      );
    }

    console.error("Item Stock Summary API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load item stock summary",
      },
      { status: 500 },
    );
  }
}