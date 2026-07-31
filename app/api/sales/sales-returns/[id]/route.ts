// app/api/sales/sales-returns/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnPayload } from "@/types/sales-return";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await SalesReturnService.getById(client, id, companyId);

    if (!result) {
      return NextResponse.json(
        { error: "Document Entry Missing" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Failed executing detail ingestion pipeline:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payload = (await request.json()) as SalesReturnPayload;

    await client.query("BEGIN");
    const result = await SalesReturnService.update(
      client,
      companyId,
      id,
      payload,
    );
    await client.query("COMMIT");

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    await client.query("ROLLBACK");
    const dbError = error as { code?: string; message?: string };
    console.error("Aborted modifying sales return context:", dbError);
    return NextResponse.json(
      { error: dbError.message || "Database transaction rejected" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await client.query("BEGIN");
    const isDeleted = await SalesReturnService.delete(client, id, companyId);

    if (!isDeleted) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Document item not found or unauthorized" },
        { status: 404 },
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: "Sales return entry removed successfully.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Aborted deleting sales return entry:", error);
    return NextResponse.json(
      { error: "Database processing exception error occurred" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

type Params = { params: Promise<{ id: string }> };

interface IncomingUpdateLine {
  lineNo: number;
  lineType: "ITEM" | "GL_ACCOUNT";
  itemId?: string | null;
  glAccountId?: string | null;
  warehouseId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  unit_price?: number;
  discountAmount: number;
  vatPercent: number;
}

export async function GET(request: Request, { params }: Params) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await SalesReturnService.getById(client, id, companyId);

    if (!result) {
      return NextResponse.json(
        { error: "Document Entry Missing" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Failed executing detail ingestion pipeline:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}


export async function PUT(request: Request, { params }: Params) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json(
        { error: "Document must contain at least one line item row." },
        { status: 400 },
      );
    }

    const sanitizedInvoiceId =
      body.salesInvoiceId && body.salesInvoiceId.trim() !== ""
        ? body.salesInvoiceId
        : null;

    await client.query("BEGIN");

    const result = await SalesReturnService.update(client, id, {
      companyId: companyId,
      customerId: body.customerId,
      salesInvoiceId: sanitizedInvoiceId,
      returnDate: body.returnDate,
      currencyId: body.currencyId,
      exchangeRate: Number(body.exchangeRate || 1.0),
      notes: body.notes || null,
      lines: body.lines.map((line: IncomingUpdateLine) => ({
        lineNo: Number(line.lineNo),
        lineType: line.lineType,
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
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice || line.unit_price), // fallback to support variations in JSON casing
        discountAmount: Number(line.discountAmount || 0),
        vatPercent: Number(line.vatPercent || 0),
      })),
    });

    await client.query("COMMIT");
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    await client.query("ROLLBACK");

    const dbError = error as { code?: string; message?: string };

    console.error("Aborted modifying sales return context:", dbError);
    return NextResponse.json(
      { error: dbError.message || "Database transaction rejected" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}


export async function DELETE(request: Request, { params }: Params) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await client.query("BEGIN");

    const isDeleted = await SalesReturnService.delete(client, id, companyId);

    if (!isDeleted) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Document item not found or unauthorized" },
        { status: 404 },
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: "Sales return entry removed successfully.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Aborted deleting sales return entry:", error);
    return NextResponse.json(
      { error: "Database processing exception error occurred" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
} */
