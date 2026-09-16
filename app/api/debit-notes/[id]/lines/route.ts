// app/api/debit-notes/[id]/lines/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockDeAllocationRecord } from "@/types/debit-note";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Debit Note ID is required.",
        },
        { status: 400 },
      );
    }

    const noteResult = await pool.query(
      `
      SELECT id
      FROM debit_notes
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
      [id, companyId],
    );

    if (noteResult.rowCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Debit Note not found.",
        },
        { status: 404 },
      );
    }

    const result = await pool.query(
      `
      SELECT
        dnl.*,

        i.item_code,
        i.name AS item_name,

        w.code AS warehouse_code,
        w.name AS warehouse_name,

        u.name AS uom_name,
        u.code AS uom_code,

        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ia.id,
                'source_allocation_id', ia.source_allocation_id,

                'debit_note_line_id', ia.debit_note_line_id,

                'inbound_entry_id', ia.inbound_entry_id,

                'purchase_order_line_id',
                  ia.purchase_order_line_id,

                'purchase_invoice_line_id',
                  ia.purchase_invoice_line_id,

                'item_id', ia.item_id,
                'warehouse_id', ia.warehouse_id,

                'warehouse_location_id',
                  ia.warehouse_location_id,

                'location_id',
                  ia.warehouse_location_id,

                'location_name',
                  wl.title,

                'batch_no', ia.batch_no,
                'bin_code', ia.bin_code,

                'expiry_date',
                  TO_CHAR(
                    ia.expiry_date,
                    'YYYY-MM-DD'
                  ),

                'unit_cost', ia.unit_cost,

                'return_quantity',
                  ia.allocated_quantity,

                'allocated_quantity',
                  ia.allocated_quantity,

                'original_quantity',
                  source.allocated_quantity,

                'already_returned_before_this_dn',
                  COALESCE(previous_returns.returned_quantity, 0),

                'available_before_this_dn',
                  GREATEST(
                    source.allocated_quantity
                    - COALESCE(
                        previous_returns.returned_quantity,
                        0
                      ),
                    0
                  ),

                'received_at',
                  source.created_at
              )
              ORDER BY source.created_at, ia.id
            )

            FROM inventory_allocations ia

            INNER JOIN inventory_allocations source
              ON source.id = ia.source_allocation_id
             AND source.company_id = ia.company_id

            LEFT JOIN warehouse_locations wl
              ON wl.id = ia.warehouse_location_id

            LEFT JOIN LATERAL (
              SELECT
                COALESCE(
                  SUM(r.allocated_quantity),
                  0
                ) AS returned_quantity

              FROM inventory_allocations r

              WHERE r.company_id = ia.company_id
                AND r.source_allocation_id = source.id
                AND r.status = 'ACTIVE'
                AND r.debit_note_line_id IS NOT NULL

                /*
                 * Exclude returns belonging to this
                 * Debit Note.
                 */
                AND NOT EXISTS (
                  SELECT 1
                  FROM debit_note_lines rdl
                  WHERE rdl.id = r.debit_note_line_id
                    AND rdl.debit_note_id = $2
                )
            ) previous_returns
              ON true

            WHERE ia.debit_note_line_id = dnl.id
              AND ia.company_id = $1
              AND ia.source_allocation_id IS NOT NULL
              AND ia.status = 'ACTIVE'
          ),
          '[]'::jsonb
        ) AS allocations

      FROM debit_note_lines dnl

      LEFT JOIN items i
        ON i.id = dnl.item_id

      LEFT JOIN warehouses w
        ON w.id = dnl.warehouse_id

      LEFT JOIN uoms u
        ON u.id = dnl.uom_id

      WHERE dnl.company_id = $1
        AND dnl.debit_note_id = $2
        AND dnl.is_deleted = false

      ORDER BY dnl.line_no, dnl.id
      `,
      [companyId, id],
    );

    const lines = result.rows.map((line) => {
      const allocations = Array.isArray(line.allocations)
        ? line.allocations
        : [];

      const quantity = Number(line.quantity) || 0;

      const allocatedQuantity = allocations.reduce(
        (sum: number, allocation: StockDeAllocationRecord) =>
          sum +
          Number(
            allocation.return_quantity ?? allocation.allocated_quantity ?? 0,
          ),
        0,
      );

      return {
        ...line,

        quantity,

        unit_cost: Number(line.unit_cost) || 0,

        allocations,

        initialAllocations: allocations,

        is_allocated: quantity > 0 && allocatedQuantity >= quantity,

        allocated_quantity: allocatedQuantity,
      };
    });

    return NextResponse.json({
      success: true,
      lines,
    });
  } catch (err) {
    console.error("[GET_DEBIT_NOTE_LINES_ERROR]:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load Debit Note lines.",
      },
      { status: 500 },
    );
  }
}

//   const result = await pool.query(
//     `
//     SELECT
//       dnl.*,

//       i.item_code,
//       i.name as item_name,

//       w.code as warehouse_code,
//       w.name as warehouse_name,

//       u.name as uom_name,
//       u.code as uom_code

//     FROM debit_note_lines dnl
//     LEFT JOIN items i ON i.id = dnl.item_id
//     LEFT JOIN warehouses w ON w.id = dnl.warehouse_id
//     LEFT JOIN uoms u ON u.id = dnl.uom_id

//     WHERE dnl.company_id=$1 AND dnl.debit_note_id=$2 AND dnl.is_deleted=false
//     ORDER BY dnl.line_no
//     `,
//     [companyId, id],
//   );

//   return NextResponse.json({
//     lines: result.rows,
//   });
// }
