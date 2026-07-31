// app/api/sales/sales-returns/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnPayload } from "@/types/sales-return";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

    const result = await SalesReturnService.getList(client, {
      companyId,
      search,
      status,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Failed to fetch commercial returns directory:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json()) as SalesReturnPayload;

    await client.query("BEGIN");

    const seqResult = await client.query(
      `SELECT get_next_sequence($1, $2) AS code`,
      [companyId, "sales_return"],
    );
    const returnNo: string = seqResult.rows[0]?.code || `SR-${Date.now()}`;

    const salesReturn = await SalesReturnService.create(
      client,
      companyId,
      payload,
      returnNo,
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      id: salesReturn.id,
      return_no: salesReturn.return_no,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Aborted creating sales return:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database transaction rejected" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

interface IncomingRequestLine {
  lineNo: number;
  lineType: "ITEM" | "GL_ACCOUNT";
  itemId?: string | null;
  glAccountId?: string | null;
  warehouseId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  vatPercent: number;
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));

    const result = await SalesReturnService.getList(client, {
      companyId,
      search,
      status,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Failed to fetch commercial returns directory:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // 1. Sanitize incoming text variations to prevent FK Constraint failures
    const sanitizedInvoiceId =
      body.salesInvoiceId && body.salesInvoiceId.trim() !== ""
        ? body.salesInvoiceId
        : null;

    // Execute inside an isolated database transactional envelope
    await client.query("BEGIN");

    const result = await SalesReturnService.create(client, {
      companyId: companyId,
      customerId: body.customerId,
      salesInvoiceId: sanitizedInvoiceId, // Pass sanitized null or valid UUID string here
      returnDate: body.returnDate,
      currencyId: body.currencyId,
      exchangeRate: Number(body.exchangeRate || 1.0),
      notes: body.notes || null,
      lines: body.lines.map((line: IncomingRequestLine) => ({
        ...line,
        // Make sure row references also transform empty strings to null safely
        itemId: line.itemId && line.itemId.trim() !== "" ? line.itemId : null,
        glAccountId:
          line.glAccountId && line.glAccountId.trim() !== ""
            ? line.glAccountId
            : null,
        warehouseId:
          line.warehouseId && line.warehouseId.trim() !== ""
            ? line.warehouseId
            : null,
        description: line.description || null,
      })),
    });

    await client.query("COMMIT");
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Aborted creating sales return:", error);
    return NextResponse.json(
      { error: "Database transaction rejected" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
} */
