// app/api/sales/sales-returns/[id]/receive/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesReturnReceiptService } from "@/lib/services/sales/sales-return-receipt.service";
import { SalesReturnService } from "@/lib/services/sales/sales-return.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

    const { order } = await req.json();

    await client.query("BEGIN");

    // 1. Fetch persistent Credit Note Lines with row locks
    const cnLinesResult = await client.query(
      `
      SELECT 
        id, line_no, item_id, warehouse_id, warehouse_location_id,
        quantity, returned_quantity, cancelled_quantity, unit_price
      FROM credit_note_lines
      WHERE credit_note_id = $1
        AND company_id = $2
        AND COALESCE(is_deleted, false) = false
        AND (line_type = 'ITEM' OR (line_type IS NULL AND item_id IS NOT NULL))
      FOR UPDATE
      `,
      [id, companyId],
    );

    const unfulfilledLines = cnLinesResult.rows.filter((l) => {
      const remaining =
        Number(l.quantity || 0) -
        Number(l.returned_quantity || 0) -
        Number(l.cancelled_quantity || 0);
      return remaining > 0;
    });

    if (!unfulfilledLines.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "No returnable lines available to receive" },
        { status: 400 },
      );
    }

    // 2. Fetch Active Allocations
    const lineIds = unfulfilledLines.map((l) => l.id);
    const allocationsResult = await client.query(
      `
      SELECT id, credit_note_line_id, warehouse_location_id, allocated_quantity,
             unit_cost, batch_no, bin_code, expiry_date, source_allocation_id
      FROM inventory_allocations
      WHERE credit_note_line_id = ANY($1::uuid[])
        AND company_id = $2
        AND status = 'ACTIVE'
      `,
      [lineIds, companyId],
    );

    const allocationsByLine = allocationsResult.rows.reduce(
      (acc: Record<string, typeof allocationsResult.rows>, alloc) => {
        if (!acc[alloc.credit_note_line_id])
          acc[alloc.credit_note_line_id] = [];
        acc[alloc.credit_note_line_id].push(alloc);
        return acc;
      },
      {},
    );

    // 3. Construct Payload
    const receiptLines = [];
    let lineNoCounter = 1;

    for (const line of unfulfilledLines) {
      const remainingQty =
        Number(line.quantity || 0) -
        Number(line.returned_quantity || 0) -
        Number(line.cancelled_quantity || 0);

      const rawCost = Number(line.unit_price || 0);
      const allocations = allocationsByLine[line.id] || [];

      if (allocations.length > 0) {
        for (const alloc of allocations) {
          const allocQty = Math.min(
            Number(alloc.allocated_quantity || 0),
            remainingQty,
          );
          if (allocQty <= 0) continue;

          receiptLines.push({
            line_no: lineNoCounter++,
            credit_note_line_id: line.id,
            item_id: line.item_id,
            warehouse_id: line.warehouse_id,
            location_id:
              alloc.warehouse_location_id || line.warehouse_location_id,
            batch_no: alloc.batch_no || null,
            serial_no: alloc.bin_code || null,
            bin_code: alloc.bin_code || null,
            expiry_date: alloc.expiry_date || null,
            quantity: allocQty,
            unit_cost: Number(alloc.unit_cost || rawCost),
            source_allocation_id: alloc.source_allocation_id || alloc.id,
          });
        }
      } else {
        receiptLines.push({
          line_no: lineNoCounter++,
          credit_note_line_id: line.id,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          location_id: line.warehouse_location_id || null,
          quantity: remainingQty,
          unit_cost: rawCost,
        });
      }
    }

    const payload = {
      receipt: {
        credit_note_id: id,
        customer_id: order?.customer_id,
        receipt_date:
          order?.receipt_date || new Date().toISOString().split("T")[0],
        posting_date:
          order?.posting_date || new Date().toISOString().split("T")[0],
        reference_no: order?.reference,
        notes: order?.notes,
        currency_id: order?.currency_id,
        exchange_rate: order?.exchange_rate,
        userId,
      },
      lines: receiptLines,
    };

    // 4. Delegate to dedicated SalesReturnReceiptService
    const receipt = await SalesReturnReceiptService.createTransactional(
      client,
      companyId,
      payload,
    );

    // 5. Recalculate status and Commit
    await SalesReturnService.recalculateStatus(client, id);

    await client.query("COMMIT");
    return NextResponse.json({ success: true, receiptId: receipt.id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Sales return stock receive error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to receive sales return",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
