// app/api/inventory/items/[id]/activity-listings/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ItemActivityListingService } from "@/lib/services/inventory/item-activity-listing.service";

import type { FetchParams } from "@/types/table";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface ListingRequest extends FetchParams {
  listingType?: "movements" | "warehouse";
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;

  if (!itemId) {
    return NextResponse.json(
      { error: "Item ID is required." },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as ListingRequest;

    if (body.listingType !== "movements" && body.listingType !== "warehouse") {
      return NextResponse.json(
        { error: "Invalid activity listing type." },
        { status: 400 },
      );
    }

    const result =
      body.listingType === "movements"
        ? await ItemActivityListingService.listMovementsPaginated(
            companyId,
            itemId,
            body,
          )
        : await ItemActivityListingService.listWarehouseStockPaginated(
            companyId,
            itemId,
            body,
          );

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    console.error("Item Activity Listing API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load item activity listing.",
      },
      { status: 500 },
    );
  }
}
