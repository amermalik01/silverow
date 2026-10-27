// app/api/energy/site/listings/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { EnergySiteService } from "@/lib/services/energy/sites/sites.service";
import { siteApiError } from "@/lib/services/energy/sites/site-api-response";

const ListingSchema = z.object({
  page: z.coerce.number().int().positive().default(1),

  pageSize: z.coerce.number().int().positive().default(20),

  search: z.string().default(""),

  sortBy: z.string().optional(),

  sortOrder: z.enum(["asc", "desc", "ASC", "DESC"]).optional(),

  statusFilter: z.enum(["active", "inactive"]).default("active"),
});

export async function POST(request: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();

    const input = ListingSchema.parse(body);

    const result = await EnergySiteService.getPaginated(companyId, {
      page: input.page,
      limit: input.pageSize,
      search: input.search,
      sortBy: input.sortBy ?? "created_at",
      sortOrder: input.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC",
      status: input.statusFilter === "active" ? 1 : 0,
    });

    // Exact response contract expected by DataTable.tsx
    return NextResponse.json({
      data: result.rows,
      totalRecords: result.totalRows,
    });
  } catch (error: unknown) {
    return siteApiError(error);
  }
}

/* import { NextResponse } from "next/server";
import { z } from "zod";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { EnergySiteService } from "@/lib/services/energy/sites/sites.service";
import { siteApiError } from "@/lib/services/energy/sites/site-api-response";

const ListingSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  searchTerm: z.string().optional(),
  sortBy: z.string().optional(),
  sortField: z.string().optional(),
  sortOrder: z.enum(["asc", "desc", "ASC", "DESC"]).optional(),
  status: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal("0"),
      z.literal("1"),
      z.literal("all"),
    ])
    .optional(),
});

export async function POST(request: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const input = ListingSchema.parse(body);

    const result = await EnergySiteService.getPaginated(companyId, {
      page: input.page,
      limit: input.pageSize ?? input.limit ?? 20,
      search: input.search ?? input.searchTerm ?? "",
      sortBy: input.sortBy ?? input.sortField ?? "created_at",
      sortOrder: input.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC",
      status:
        input.status === undefined || input.status === "all"
          ? undefined
          : Number(input.status),
    });

    console.log("[Energy Sites Listing]", {
      companyId,
      request: input,
      totalRows: result.totalRows,
      returnedRows: result.rows.length,
      firstRow: result.rows[0] ?? null,
    });

    return NextResponse.json({
      success: true,
      rows: result.rows,
      data: result.rows,
      totalRows: result.totalRows,
      total: result.totalRows,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error: unknown) {
    return siteApiError(error);
  }
}
 */
