// /app/api/sales/posted-returns/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

export async function GET(request: Request) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10"));
    const offset = (page - 1) * limit;

    /* const result = await SalesReturnService.listPosted(client, companyId, {
      customerId,
      search,
      limit,
      offset,
    }); */

    return NextResponse.json({
      success: true,
      // data: result.records,
      // meta: {
      //   total: result.total,
      //   page,
      //   limit,
      //   totalPages: Math.ceil(result.total / limit),
      // },
    });
  } catch (error) {
    console.error("Posted Credit Note lookup execution aborted:", error);
    const dbError = error as { code?: string; message?: string };
    return NextResponse.json(
      {
        error: dbError.message || "Failed parsing historical voucher ledgers.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
