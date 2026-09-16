// app/api/debit-notes/inventory-allocations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockDeAllocationValidationService } from "@/lib/services/debit-notes/stock-deallocation-validation.service";

export async function GET(req: NextRequest) {
  let client;

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

    const { searchParams } = new URL(req.url);

    const itemId = searchParams.get("item_id");
    const warehouseId = searchParams.get("warehouse_id");
    const debitNoteLineId = searchParams.get("debit_note_line_id");
    const purchaseInvoiceLineId = searchParams.get("purchase_invoice_line_id");
    const purchaseOrderLineId = searchParams.get("purchase_order_line_id");

    if (!itemId && !debitNoteLineId) {
      return NextResponse.json(
        {
          success: false,
          error: "item_id or debit_note_line_id is required.",
        },
        { status: 400 },
      );
    }

    if (itemId && !warehouseId) {
      return NextResponse.json(
        {
          success: false,
          error: "warehouse_id is required when item_id is provided.",
        },
        { status: 400 },
      );
    }

    client = await pool.connect();

    if (debitNoteLineId) {
      const existingResult = await client.query(
        `
        SELECT
          ia.id,
          ia.company_id,

          ia.debit_note_line_id,
          ia.source_allocation_id,

          ia.purchase_order_line_id,
          ia.purchase_invoice_line_id,

          ia.inbound_entry_id,

          ia.item_id,
          ia.warehouse_id,

          ia.batch_no,
          ia.bin_code,

          TO_CHAR(
            ia.expiry_date,
            'YYYY-MM-DD'
          ) AS expiry_date,

          ia.allocated_quantity AS return_quantity,
          ia.unit_cost,

          ia.warehouse_location_id AS location_id,
          wl.title AS location_name,

          source.allocated_quantity AS original_quantity,

          COALESCE(
            (
              SELECT SUM(r.allocated_quantity)
              FROM inventory_allocations r
              INNER JOIN debit_note_lines rdl
                ON rdl.id = r.debit_note_line_id
              INNER JOIN debit_notes rdn
                ON rdn.id = rdl.debit_note_id
              WHERE r.source_allocation_id = source.id
                AND r.company_id = $1
                AND r.status = 'ACTIVE'
                AND r.id <> ia.id
                AND rdn.id <> rdn_current.id
            ),
            0
          ) AS already_returned_before_this_dn

        FROM inventory_allocations ia

        INNER JOIN inventory_allocations source
          ON source.id = ia.source_allocation_id
         AND source.company_id = ia.company_id

        INNER JOIN debit_note_lines current_dnl
          ON current_dnl.id = ia.debit_note_line_id
         AND current_dnl.company_id = ia.company_id
         AND current_dnl.debit_note_id = $2

        INNER JOIN debit_notes rdn_current
          ON rdn_current.id = current_dnl.debit_note_id
         AND rdn_current.company_id = ia.company_id

        LEFT JOIN warehouse_locations wl
          ON wl.id = ia.warehouse_location_id

        WHERE ia.company_id = $1
          AND ia.debit_note_line_id = $2
          AND ia.status = 'ACTIVE'
          AND ia.source_allocation_id IS NOT NULL

        ORDER BY
          source.created_at,
          source.id
        `,
        [companyId, debitNoteLineId],
      );

      const data = existingResult.rows.map((row) => {
        const originalQuantity = Number(row.original_quantity) || 0;

        const alreadyReturned =
          Number(row.already_returned_before_this_dn) || 0;

        const returnQuantity = Number(row.return_quantity) || 0;

        const availableBeforeThisDn = Math.max(
          originalQuantity - alreadyReturned,
          0,
        );

        return {
          ...row,

          original_quantity: originalQuantity,
          already_returned_before_this_dn: alreadyReturned,
          available_before_this_dn: availableBeforeThisDn,

          return_quantity: returnQuantity,

          available_quantity_for_edit: availableBeforeThisDn + returnQuantity,
        };
      });

      return NextResponse.json({
        success: true,
        data,
      });
    }

    const result = await client.query(
      `
      SELECT
        ia.id AS source_allocation_id,

        ia.company_id,

        ia.inbound_entry_id,

        ia.item_id,
        ia.warehouse_id,

        ia.warehouse_location_id AS location_id,
        wl.title AS location_name,

        ia.batch_no,
        ia.bin_code,

        TO_CHAR(
          ia.expiry_date,
          'YYYY-MM-DD'
        ) AS expiry_date,

        ia.allocated_quantity AS received_quantity,

        ia.unit_cost,

        ia.purchase_order_line_id,
        ia.purchase_invoice_line_id,

        ia.created_at AS received_at,

        COALESCE(
          returned.returned_quantity,
          0
        ) AS returned_quantity,

        GREATEST(ia.allocated_quantity - COALESCE(returned.returned_quantity, 0), 0) AS available_quantity

      FROM inventory_allocations ia

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
          AND r.source_allocation_id = ia.id
          AND r.status = 'ACTIVE'
          AND r.debit_note_line_id IS NOT NULL
      ) returned
        ON true

      WHERE ia.company_id = $1
        AND ia.item_id = $2
        AND ia.warehouse_id = $3

        AND ia.inbound_entry_id IS NOT NULL
        AND ia.source_allocation_id IS NULL
        AND ia.debit_note_line_id IS NULL

        AND ia.status = 'ACTIVE'

        AND (ia.allocated_quantity - COALESCE(returned.returned_quantity, 0)) > 0

      ORDER BY
        ia.created_at ASC,
        ia.id ASC
      `,
      [companyId, itemId, warehouseId],
    );

    const data = result.rows.map((row) => ({
      ...row,

      received_quantity: Number(row.received_quantity) || 0,

      returned_quantity: Number(row.returned_quantity) || 0,

      available_quantity: Number(row.available_quantity) || 0,

      unit_cost: Number(row.unit_cost) || 0,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[GET_INVENTORY_ALLOCATIONS_ERROR]:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch available inventory allocations.",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
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

    const { debit_note_line_id, required_quantity, allocations } = body;

    if (
      required_quantity === undefined ||
      required_quantity === null ||
      required_quantity === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "required_quantity is required.",
        },
        { status: 400 },
      );
    }

    const requiredQuantity = Number(required_quantity);

    if (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "required_quantity must be greater than zero.",
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(allocations)) {
      return NextResponse.json(
        {
          success: false,
          error: "allocations must be an array.",
        },
        { status: 400 },
      );
    }

    if (allocations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one allocation is required.",
        },
        { status: 400 },
      );
    }

    if (debit_note_line_id) {
      const lineResult = await client.query(
        `
        SELECT
          dnl.id,
          dnl.item_id,
          dnl.warehouse_id,
          dnl.quantity,

          dn.id AS debit_note_id,
          dn.company_id

        FROM debit_note_lines dnl

        INNER JOIN debit_notes dn
          ON dn.id = dnl.debit_note_id

        WHERE dnl.id = $1
          AND dnl.company_id = $2
          AND dnl.is_deleted = false
          AND dn.company_id = $2
        `,
        [debit_note_line_id, companyId],
      );

      if (lineResult.rowCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Debit Note line not found.",
          },
          { status: 404 },
        );
      }

      const line = lineResult.rows[0];

      const lineQuantity = Number(line.quantity) || 0;

      if (requiredQuantity > lineQuantity) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Required return quantity cannot exceed the Debit Note line quantity.",
          },
          { status: 400 },
        );
      }
    }

    await client.query("BEGIN");

    const result = await StockDeAllocationValidationService.validate(
      client,
      companyId,
      {
        debit_note_line_id: debit_note_line_id || null,

        required_quantity: requiredQuantity,

        allocations,
      },
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Stock deallocation validation successful.",
      data: result,
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors.
    }

    const message =
      err instanceof Error
        ? err.message
        : "Stock deallocation validation failed.";

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

/* import { NextRequest, NextResponse } from "next/server";
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
 */
