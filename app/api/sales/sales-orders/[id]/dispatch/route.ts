// app/api/sales/sales-orders/[id]/dispatch/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockAllocationService } from "@/lib/services/sales/stock-allocation.service";
import { StockAllocationPayload } from "@/types/sales-order";
import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface IncomingDispatch {
  customer_id: string;
  warehouse_id?: string;
  dispatch_date?: string;
  posting_date?: string;
  reference?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
  financials?: {
    amount: number;
    discount?: number;
    vat: number;
    amountInclVat: number;
  };
}

interface RequestBody {
  dispatch: IncomingDispatch;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    const userId = req.headers.get("x-user-id") || undefined;
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body: RequestBody = await req.json();

    const { dispatch } = body;

    await client.query("BEGIN");

    // 1. Fetch persistent Sales Order Lines directly from DB with row locks
    const soLinesResult = await client.query(
      `
      SELECT 
        id,
        line_no,
        line_type,
        item_id,
        warehouse_id,
        quantity,
        quantity_shipped,
        unit_price,
        discount_amount
      FROM sales_order_lines
      WHERE sales_order_id = $1
        AND company_id = $2
        AND COALESCE(is_deleted, false) = false
        AND (line_type = 'ITEM' OR (line_type IS NULL AND item_id IS NOT NULL))
      FOR UPDATE
      `,
      [id, companyId]
    );

    const dbLines = soLinesResult.rows;

    // 2. Filter for lines that still have remaining quantities to ship
    const unfulfilledLines = dbLines.filter((l) => {
      const qty = Number(l.quantity || 0);
      const shipped = Number(l.quantity_shipped || 0);
      return qty - shipped > 0;
    });

    if (!unfulfilledLines.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          success: false,
          error:
            "No open line quantities available to dispatch on this sales order.",
        },
        { status: 400 }
      );
    }

    // 3. Map database lines to StockAllocationPayload format
    const payload: StockAllocationPayload = {
      dispatch: {
        sales_order_id: id,
        customer_id: dispatch.customer_id,
        warehouse_id:
          dispatch.warehouse_id || unfulfilledLines[0]?.warehouse_id,
        dispatch_date:
          dispatch.dispatch_date || new Date().toISOString().split("T")[0],
        posting_date:
          dispatch.posting_date || new Date().toISOString().split("T")[0],
        reference_no: dispatch.reference,
        notes: dispatch.notes,
        currency_id: dispatch.currency_id,
        exchange_rate: dispatch.exchange_rate,
        userId,
      },
      lines: unfulfilledLines.map((line, idx) => {
        const remainingQty =
          Number(line.quantity || 0) - Number(line.quantity_shipped || 0);
        const rawPrice = Number(line.unit_price || 0);
        const totalLineQty = Number(line.quantity || 1);
        const totalDiscount = Number(line.discount_amount || 0);

        // Pro-rate discount per unit
        const discountPerUnit = totalDiscount / totalLineQty;
        const netUnitPrice = rawPrice - discountPerUnit;

        return {
          line_no: idx + 1,
          sales_order_line_id: line.id,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id || dispatch.warehouse_id,
          quantity: remainingQty,
          unit_price: netUnitPrice,
        };
      }),
    };

    // 4. Execute Transactional Stock Allocation & GL Ledger Entries
    const dispatchResult = await StockAllocationService.createTransactional(
      client,
      companyId,
      payload
    );

    // 5. Recalculate Sales Order Status dynamically
    await SalesOrderService.recalculateStatus(client, id);

    await client.query("COMMIT");
    return NextResponse.json({ success: true, dispatchId: dispatchResult.id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Sales order dispatch error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to dispatch sales order",
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}