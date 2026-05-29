// /app/api/sales/sales-orders/[id]/shipment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { InventoryAllocationService } from "@/lib/services/inventory/inventory-allocation.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const body = await req.json();
  const { lines } = body as {
    lines: Array<{
      salesOrderLineId: string;
      itemId: string;
      warehouseId: string;
      quantity: number;
    }>;
  };

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const line of lines) {
      // 1. Locate the reservation active for this Sales Order Line row
      const resResult = await client.query<{ id: string; company_id: string }>(
        `
        SELECT id, company_id 
        FROM inventory_reservations
        WHERE line_reference_id = $1
          AND reference_type = 'SALES_ORDER'
          AND status IN ('OPEN', 'PARTIAL', 'ALLOCATED')
        LIMIT 1
        `,
        [line.salesOrderLineId]
      );

      if (!resResult.rows.length) {
        throw new Error(`No active reservation entry found for Order Line row: ${line.salesOrderLineId}`);
      }

      const reservation = resResult.rows[0];

      // 2. Process reservation depletion and status changes
      await InventoryAllocationService.consumeReservation(
        client,
        reservation.id,
        line.quantity
      );

      // 3. Subtract physical item balances directly out of the Warehouse stock
      await client.query(
        `
        UPDATE inventory_stock
        SET 
          quantity_on_hand = GREATEST(0, quantity_on_hand - $1),
          updated_at = now()
        WHERE company_id = $2
          AND item_id = $3
          AND warehouse_id = $4
        `,
        [line.quantity, reservation.company_id, line.itemId, line.warehouseId]
      );

      // 4. Record new physical values directly to the Sales Order document row
      await client.query(
        `
        UPDATE sales_order_lines
        SET 
          shipped_quantity = COALESCE(shipped_quantity, 0) + $1,
          quantity_reserved = GREATEST(0, COALESCE(quantity_reserved, 0) - $1)
        WHERE id = $2
        `,
        [line.quantity, line.salesOrderLineId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Shipment route failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Shipment processing failed" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}