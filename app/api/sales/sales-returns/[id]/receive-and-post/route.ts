// app/api/sales/sales-returns/[id]/receive-and-post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnPostingService } from "@/lib/services/sales/sales-return-posting.service";
import { SalesReturnReceiptService } from "@/lib/services/sales/sales-return-receipt.service"; // Adjust import to your sales receipt/return service

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface ReceiveAndPostSalesReturnRequestBody {
  customer_credit_note_no?: string;
  credit_note_date?: string;
  due_date?: string;
  posting_date?: string;
  notes?: string;
  currency_id?: string;
  exchange_rate?: number;
  financials: {
    amount: number;
    vat: number;
    amountInclVat: number;
  };
  order: {
    customer_id: string;
    receipt_date?: string;
    posting_date?: string;
    reference?: string;
    notes?: string;
    currency_id?: string;
    exchange_rate?: number;
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

    const body: ReceiveAndPostSalesReturnRequestBody = await req.json();

    await client.query("BEGIN");

    // ==========================================
    // STEP 1: RECEIVE REMAINING UNFULFILLED RETURN STOCK
    // ==========================================
    const returnLinesResult = await client.query(
      `
      SELECT 
        id,
        line_no,
        item_id,
        warehouse_id,
        quantity,
        returned_quantity,
        unit_price,
        discount_amount,
        line_type
      FROM credit_note_lines
      WHERE credit_note_id = $1
        AND company_id = $2
        AND COALESCE(is_deleted, false) = false
        AND (line_type = 'ITEM' OR (line_type IS NULL AND item_id IS NOT NULL))
      FOR UPDATE
      `,
      [id, companyId],
    );

    const dbLines = returnLinesResult.rows;
    const unfulfilledLines = dbLines.filter((l) => {
      const qty = Number(l.quantity || 0);
      const ret = Number(l.returned_quantity || 0);
      return qty - ret > 0;
    });

    if (unfulfilledLines.length > 0) {
      const receiptPayload = {
        receipt: {
          credit_note_id: id,
          customer_id: body.order.customer_id,
          receipt_date:
            body.order.receipt_date || new Date().toISOString().split("T")[0],
          posting_date:
            body.order.posting_date || new Date().toISOString().split("T")[0],
          reference_no: body.order.reference,
          notes: body.order.notes,
          currency_id: body.order.currency_id,
          exchange_rate: body.order.exchange_rate,
          userId,
        },
        lines: unfulfilledLines.map((line, idx) => {
          const remainingQty =
            Number(line.quantity || 0) - Number(line.returned_quantity || 0);
          const rawPrice = Number(line.unit_price || 0);
          const totalLineQty = Number(line.quantity || 1);
          const totalDiscount = Number(line.discount_amount || 0);

          const discountPerUnit = totalDiscount / totalLineQty;
          const netUnitPrice = rawPrice - discountPerUnit;

          return {
            line_no: idx + 1,
            credit_note_line_id: line.id,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            quantity: remainingQty,
            unit_cost: netUnitPrice,
          };
        }),
      };

      // Create stock receipt record / inventory movement inside the transaction
      await SalesReturnReceiptService.createTransactional(
        client,
        companyId,
        receiptPayload,
      );
    }

    // ==========================================
    // STEP 2: POST SALES CREDIT NOTE TO GL / AR
    // ==========================================
    const creditNoteResult =
      await SalesReturnPostingService.postSalesReturnTransactional(client, {
        companyId,
        salesReturnId: id,
        userId,
        skipReturnMatchCheck: true, // Bypass check since stock was received in Step 1
        creditNoteData: {
          customer_credit_note_no: body.customer_credit_note_no,
          credit_note_date: body.credit_note_date,
          due_date: body.due_date,
          posting_date: body.posting_date,
          notes: body.notes,
          currency_id: body.currency_id,
          exchange_rate: body.exchange_rate,
        },
        financials: body.financials,
      });

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      creditNoteId: creditNoteResult.id,
      creditNoteNo: creditNoteResult.credit_note_no,
      message: "Stock received & Sales Credit Note posted successfully.",
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("[SALES_RETURN_RECEIVE_AND_POST_FAILURE]:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to receive stock and post sales credit note.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}