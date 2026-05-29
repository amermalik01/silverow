// app/api/sales/sales-quotes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesQuotePayload } from "@/types/sales-quote";
import { SalesQuoteService } from "@/lib/services/sales/sales-quote.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract search, pagination, and filter criteria
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10"));
    const offset = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    // Build conditional query filters safely using parameters
    const queryParams: (string | number)[] = [companyId];

    let queryFilter = `WHERE q.company_id = $1`;

    if (status) {
      queryParams.push(status);
      queryFilter += ` AND q.status = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      queryFilter += ` AND (q.quote_no ILIKE $${queryParams.length} OR p.name ILIKE $${queryParams.length})`;
    }

    // 1. Fetch Total count for current filter set
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM sales_quotes q
      JOIN parties p ON q.customer_id = p.id AND p.type = 'customer'
      ${queryFilter}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRows = countResult.rows[0]?.total || 0;

    // 2. Append Pagination controls to final query execution
    queryParams.push(limit, offset);

    const dataQuery = `
      SELECT q.*, p.name as customer_name
      FROM sales_quotes q
      JOIN parties p ON q.customer_id = p.id AND p.type = 'customer'
      ${queryFilter}
      ORDER BY q.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    const dataResult = await pool.query(dataQuery, queryParams);

    return NextResponse.json({
      rows: dataResult.rows,
      pagination: {
        total: totalRows,
        page,
        limit,
        totalPages: Math.ceil(totalRows / limit),
      },
    });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to fetch quotes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as SalesQuotePayload;
    await client.query("BEGIN");

    const seqResult = await client.query(
      `SELECT get_next_sequence($1, $2) AS code`,
      [companyId, "sales_quotation"],
    );
    const quoteNo = seqResult.rows[0].code;

    const quote = await SalesQuoteService.create(
      client,
      companyId,
      payload,
      quoteNo,
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true, id: quote.id });
  } catch (err) {
    await client.query("ROLLBACK");

    const dbError = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: dbError.message || "Save failed" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
