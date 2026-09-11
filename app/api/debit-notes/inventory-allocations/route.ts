// app/api/debit-notes/inventory-allocations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockDeAllocationValidationService } from "@/lib/services/debit-notes/stock-deallocation-validation.service";

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
    const purchaseInvoiceLineId = searchParams.get("purchase_invoice_line_id");
    const purchaseOrderLineId = searchParams.get("purchase_order_line_id");
    const debitNoteLineId = searchParams.get("debit_note_line_id");

    if (!purchaseInvoiceLineId && !purchaseOrderLineId && !debitNoteLineId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "purchase_invoice_line_id, purchase_order_line_id or debit_note_line_id is required",
        },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT
          ia.id,
          ia.company_id,

          ia.purchase_order_line_id,
          ia.purchase_invoice_line_id,
          ia.debit_note_line_id,

          ia.batch_no,
          ia.bin_code,

          TO_CHAR(
            ia.expiry_date,
            'YYYY-MM-DD'
          ) AS expiry_date,

          ia.allocated_quantity,
          ia.unit_cost,

          ia.warehouse_location_id AS location_id,
          wl.title AS location_name

        FROM inventory_allocations ia

        LEFT JOIN warehouse_locations wl
          ON wl.id = ia.warehouse_location_id

        WHERE ia.company_id = $1

          AND (
            (
              $2::uuid IS NOT NULL
              AND ia.debit_note_line_id = $2::uuid
            )

            OR

            (
              $3::uuid IS NOT NULL
              AND ia.purchase_order_line_id = $3::uuid
            )

            OR

            (
              $4::uuid IS NOT NULL
              AND ia.purchase_invoice_line_id = $4::uuid
            )

            OR

            (
              $4::uuid IS NOT NULL

              AND EXISTS (
                SELECT 1

                FROM purchase_invoice_lines pil

                WHERE pil.id = $4::uuid
                  AND pil.company_id = $1
                  AND pil.purchase_order_line_id =
                      ia.purchase_order_line_id
              )
            )
          )

        ORDER BY
          ia.batch_no NULLS FIRST,
          ia.bin_code NULLS FIRST,
          ia.expiry_date NULLS FIRST,
          ia.id
        `,
        [
          companyId,
          debitNoteLineId || null,
          purchaseOrderLineId || null,
          purchaseInvoiceLineId || null,
        ],
      );

      return NextResponse.json({
        success: true,
        data: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_INVENTORY_ALLOCATIONS_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch allocations." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const body = await req.json();

    const {
      debit_note_line_id,
      purchase_invoice_line_id,
      purchase_order_line_id,
      required_quantity,
      allocations,
    } = body;

    if (!required_quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "required_quantity is required.",
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one allocation is required.",
        },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const result = await StockDeAllocationValidationService.validate(
      client,
      companyId,
      {
        debit_note_line_id,
        purchase_invoice_line_id,
        purchase_order_line_id,
        required_quantity,
        allocations,
      },
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Stock allocation validation successful.",
      data: result,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    const message =
      err instanceof Error
        ? err.message
        : "Stock allocation validation failed.";

    console.error("[POST_DEBIT_NOTE_ALLOCATION_VALIDATION]:", err);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 },
    );
  } finally {
    client.release();
  }
}

// if (!purchaseInvoiceLineId && !debitNoteLineId) {
//   return NextResponse.json(
//     {
//       success: false,
//       error:
//         "Either purchase_invoice_line_id or debit_note_line_id is required",
//     },
//     { status: 400 },
//   );
// }

/* const res = await client.query(
        `SELECT 
           ia.id,
           ia.company_id,

           ia.purchase_order_line_id,
           ia.purchase_invoice_line_id, 
           ia.debit_note_line_id,

           ia.batch_no, 
           ia.bin_code,

           TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date,

           ia.allocated_quantity, 
           ia.unit_cost,

           ia.warehouse_location_id AS location_id,
           wl.title AS location_name
           
         FROM public.inventory_allocations ia
         LEFT JOIN public.warehouse_locations wl ON wl.id = ia.warehouse_location_id
         LEFT JOIN public.purchase_invoice_lines pil ON pil.id = $3::uuid
         WHERE ia.company_id = $1 
           AND (
             ($2::uuid IS NOT NULL AND ia.debit_note_line_id = $2::uuid)
             OR 
             ($4::uuid IS NOT NULL AND ia.purchase_order_line_id = $4::uuid)
             OR 
             ($3::uuid IS NOT NULL AND (
               ia.purchase_invoice_line_id = $3::uuid 
               OR (pil.purchase_order_line_id IS NOT NULL AND ia.purchase_order_line_id = pil.purchase_order_line_id)
             ))
           )`,
        [
          companyId,
          debitNoteLineId || null,
          purchaseInvoiceLineId || null,
          purchaseOrderLineId || null,
        ],
      ); */
