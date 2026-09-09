// app/api/debit-notes/[id]/dispatch-and-post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockDeAllocationService } from "@/lib/services/debit-notes/stock-deallocation.service";
import { DebitNotePostingService } from "@/lib/services/debit-notes/debit-note-posting.service";
import { DebitNoteService } from "@/lib/services/debit-notes/debit-note.service";
import { StockDeAllocationPayload } from "@/types/debit-note";

type RouteContext = {
  params: Promise<{ id: string }>;
};

interface DispatchAndPostRequestBody {
  supplier_id: string;
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
    // STEP 1: DISPATCH / RETURN REMAINING UNFULFILLED STOCK
    // =========================================================================
    const dnLinesResult = await client.query(
      `
      SELECT 
        id,
        line_no,
        line_type,
        item_id,
        warehouse_id,
        quantity,
        returned_quantity,
        unit_cost,
        discount_amount
      FROM debit_note_lines
      WHERE debit_note_id = $1
        AND company_id = $2
        AND COALESCE(is_deleted, false) = false
        AND (line_type = 'ITEM' OR (line_type IS NULL AND item_id IS NOT NULL))
      FOR UPDATE
      `,
      [id, companyId],
    );

    const dbLines = dnLinesResult.rows;

    const unfulfilledLines = dbLines.filter((l) => {
      const qty = Number(l.quantity || 0);
      const ret = Number(l.returned_quantity || 0);
      return qty - ret > 0;
    });

    let dispatchResult = null;

    if (unfulfilledLines.length > 0) {
      const payload: StockDeAllocationPayload = {
        dispatch: {
          debit_note_id: id,
          vendor_id: body.supplier_id,
          warehouse_id: body.warehouse_id || unfulfilledLines[0]?.warehouse_id,
          dispatch_date:
            body.dispatch_date || new Date().toISOString().split("T")[0],
          posting_date:
            body.posting_date || new Date().toISOString().split("T")[0],
          reference_no: body.reference,
          notes: body.notes,
        },
        lines: unfulfilledLines.map((line, idx) => {
          const remainingQty =
            Number(line.quantity || 0) - Number(line.returned_quantity || 0);
          const rawCost = Number(line.unit_cost || 0);
          const totalLineQty = Number(line.quantity || 1);
          const totalDiscount = Number(line.discount_amount || 0);

          const discountPerUnit = totalDiscount / totalLineQty;
          const netUnitCost = rawCost - discountPerUnit;

          return {
            line_no: idx + 1,
            debit_note_line_id: line.id,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id || body.warehouse_id,
            quantity: remainingQty,
            unit_cost: netUnitCost,
          };
        }),
      };

      dispatchResult = await StockDeAllocationService.createTransactional(
        client,
        companyId,
        payload,
      );
    }

    // =========================================================================
    // STEP 2: POST DEBIT NOTE TO GL / AP
    // =========================================================================
    const postingResult =
      await DebitNotePostingService.postDebitNoteTransactional(client, {
        companyId,
        debitNoteId: id,
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
    // STEP 3: RECALCULATE DEBIT NOTE STATUS & COMMIT
    // =========================================================================
    await DebitNoteService.recalculateStatus(client, id);

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      dispatchId: dispatchResult?.id || null,
      debitNoteId: postingResult.id,
      debitNoteNo: postingResult.debit_note_no,
      journalId: postingResult.journalId,
      message: "Stock dispatched & Debit Note posted cleanly to GL and AP.",
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("[DISPATCH_AND_POST_FAILURE]:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to dispatch stock and post debit note.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
