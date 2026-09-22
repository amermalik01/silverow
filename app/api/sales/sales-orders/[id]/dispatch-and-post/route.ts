// app/api/sales/sales-orders/[id]/dispatch-and-post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockAllocationService } from "@/lib/services/sales/stock-allocation.service";
import { SalesOrderService } from "@/lib/services/sales/sales-order.service";
import { StockAllocationPayload } from "@/types/sales-order";
import { SalesOrderPostingService } from "@/lib/services/sales/sales-order-posting.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface DispatchAndPostRequestBody {
  customer_id: string;
  dispatch_date?: string;
  posting_date?: string;
  reference?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
  warehouse_id?: string;
  financials?: {
    amount: number;
    discount?: number;
    vat: number;
    amountInclVat: number;
  };
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
        { status: 401 },
      );
    }

    const body: DispatchAndPostRequestBody = await req.json().catch(() => ({}));

    await client.query("BEGIN");

    // =========================================================================
    // STEP 1: DISPATCH REMAINING UNFULFILLED STOCK FOR SALES ORDER
    // =========================================================================
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
      [id, companyId],
    );

    const dbLines = soLinesResult.rows;

    const unfulfilledLines = dbLines.filter((l) => {
      const qty = Number(l.quantity || 0);
      const shipped = Number(l.quantity_shipped || 0);
      return qty - shipped > 0;
    });

    let dispatchResult = null;

    if (unfulfilledLines.length > 0) {
      const payload: StockAllocationPayload = {
        dispatch: {
          sales_order_id: id,
          customer_id: body.customer_id,
          warehouse_id: body.warehouse_id || unfulfilledLines[0]?.warehouse_id,
          dispatch_date:
            body.dispatch_date || new Date().toISOString().split("T")[0],
          posting_date:
            body.posting_date || new Date().toISOString().split("T")[0],
          reference_no: body.reference,
          notes: body.notes,
          currency_id: body.currency_id,
          exchange_rate: body.exchange_rate,
          userId,
        },
        lines: unfulfilledLines.map((line, idx) => {
          const remainingQty =
            Number(line.quantity || 0) - Number(line.quantity_shipped || 0);
          const rawPrice = Number(line.unit_price || 0);
          const totalLineQty = Number(line.quantity || 1);
          const totalDiscount = Number(line.discount_amount || 0);

          const discountPerUnit = totalDiscount / totalLineQty;
          const netUnitPrice = rawPrice - discountPerUnit;

          return {
            line_no: idx + 1,
            sales_order_line_id: line.id,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id || body.warehouse_id,
            quantity: remainingQty,
            unit_price: netUnitPrice,
          };
        }),
      };

      dispatchResult = await StockAllocationService.createTransactional(
        client,
        companyId,
        payload,
      );
    }

    // =========================================================================
    // STEP 2: POST SALES ORDER TO GL / AR
    // =========================================================================
    const postingResult =
      await SalesOrderPostingService.postSalesOrderTransactional(client, {
        companyId,
        salesOrderId: id,
        userId,
        postingData: {
          posting_date: body.posting_date,
          notes: body.notes,
          currency_id: body.currency_id,
          exchange_rate: body.exchange_rate,
        },
        financials: body.financials,
      });

    // =========================================================================
    // STEP 3: RECALCULATE SALES ORDER STATUS & COMMIT
    // =========================================================================
    await SalesOrderService.recalculateStatus(client, id);

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      dispatchId: dispatchResult?.id || null,
      salesOrderId: postingResult.id,
      salesOrderNo: postingResult.sales_order_no,
      journalId: postingResult.journalId,
      message: "Stock dispatched & Sales Order posted.",
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("[SALES_ORDER_DISPATCH_AND_POST_FAILURE]:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to dispatch stock and post sales order.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
