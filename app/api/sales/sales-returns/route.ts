// app/api/sales/sales-returns/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");
    const search = searchParams.get("search");

    // If pagination parameters are present, call listPaginated; otherwise fall back to list
    if (page || pageSize || search) {
      const data = await SalesReturnService.listPaginated(companyId, {
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 20,
        search: search || "",
      });

      return NextResponse.json({
        success: true,
        ...data,
      });
    }

    const data = await SalesReturnService.listPaginated(companyId, {});

    return NextResponse.json({
      success: true,
      data: data.data,
      totalRecords: data.totalRecords,
    });
  } catch (err) {
    console.error("Sales return list error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sales returns",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { lines } = body;

    await client.query("BEGIN");

    // 1. Create base document shell and lines
    const createdReturn = await SalesReturnService.create(companyId, body);

    if (!createdReturn || !createdReturn.id) {
      throw new Error(
        "Failed to generate a valid sales return identification sequence.",
      );
    }

    const salesReturnID: string = createdReturn.id;

    // 2. Fetch newly created lines to extract their primary key IDs
    const savedLinesResult = await client.query(
      `SELECT id, item_id, warehouse_id, line_no 
       FROM credit_note_lines 
       WHERE credit_note_id = $1 AND COALESCE(is_deleted, false) = false 
       ORDER BY line_no`,
      [salesReturnID],
    );

    // 3. Match payload lines to real database IDs and save allocations
    // if (lines && Array.isArray(lines)) {
    //   for (let i = 0; i < lines.length; i++) {
    //     const payloadLine = lines[i];
    //     const dbLine = savedLinesResult.rows[i];

    //     if (dbLine && payloadLine.allocations?.length > 0) {
    //       await SalesReturnService.saveLineAllocations(
    //         client,
    //         companyId,
    //         SalesReturnService,
    //         dbLine.id,
    //         dbLine.item_id,
    //         dbLine.warehouse_id,
    //         payloadLine.allocations,
    //       );
    //     }
    //   }
    // }

    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, data: createdReturn },
      { status: 201 },
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Sales return create error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to create sales return",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
