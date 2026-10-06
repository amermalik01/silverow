// app/api/inventory/transfer-stock/listing/route.ts

import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import {
  TransferStockService,
  type TransferTableColumnFilters,
} from "@/lib/services/inventory/transfer-stock.service";

type TransferListingRequest = {
  page?: number;
  pageSize?: number;
  status?: "all" | "posted" | "unposted";
  filters?: TransferTableColumnFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as TransferListingRequest;

    const page = Math.max(1, Number(body.page ?? 1));

    const pageSize = Math.min(100, Math.max(1, Number(body.pageSize ?? 50)));

    const status = body.status ?? "unposted";

    const result = await TransferStockService.list(companyId, {
      status,
      page,
      limit: pageSize,
      filters: body.filters,
      sortBy: body.sortBy,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({
      data: result.rows,
      totalRecords: result.pagination.total,
    });
  } catch (err) {
    console.error("[TRANSFER_STOCK_LISTING_POST_ERROR]", err);

    const message =
      err instanceof Error
        ? err.message
        : "Failed to load stock transfer listing.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
