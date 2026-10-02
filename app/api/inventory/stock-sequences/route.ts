// api/inventory/stock-sequences/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

/**
 * GET /api/inventory/stock-sequences
 *
 * Query parameters:
 *
 * item_id       required
 * warehouse_id  required
 * location_id   optional
 *
 * Example:
 *
 * /api/inventory/stock-sequences
 *   ?item_id=xxx
 *   &warehouse_id=yyy
 *   &location_id=zzz
 *
 * Returns stock sequences suitable for the Item Journal
 * Stock Allocation modal.
 */

export async function GET(req: NextRequest) {
  try {
    /**
     * -------------------------------------------------------
     * Company
     * -------------------------------------------------------
     */
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    /**
     * -------------------------------------------------------
     * Query parameters
     * -------------------------------------------------------
     */
    const { searchParams } = new URL(req.url);

    const itemId = String(searchParams.get("item_id") || "").trim();

    const warehouseId = String(searchParams.get("warehouse_id") || "").trim();

    const locationId = String(searchParams.get("location_id") || "").trim();

    /**
     * -------------------------------------------------------
     * Validate required parameters
     * -------------------------------------------------------
     */
    if (!itemId) {
      return NextResponse.json(
        {
          error: "item_id is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!warehouseId) {
      return NextResponse.json(
        {
          error: "warehouse_id is required.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * -------------------------------------------------------
     * Build query
     *
     * inventory_allocations contains:
     *
     * - item_id
     * - warehouse_id
     * - warehouse_location_id
     * - batch_no
     * - bin_code
     * - expiry_date
     * - date_received
     * - prod_date
     * - allocated_quantity
     * - unit_cost
     * - status
     *
     * The Item Journal hook expects:
     *
     * location_id
     * location_name
     * batch_no
     * sequence_no
     * serial_no
     * date_received
     * prod_date
     * expiry_date
     * available_quantity
     *
     * There is no sequence_no column visible in the
     * schema you provided, so sequence_no is generated
     * deterministically from the allocation row id.
     * -------------------------------------------------------
     */

    const values: Array<string> = [companyId, itemId, warehouseId];

    let locationCondition = "";

    if (locationId) {
      values.push(locationId);

      locationCondition = `
        AND ia.warehouse_location_id = $${values.length}
      `;
    }

    /**
     * -------------------------------------------------------
     * Fetch stock records
     * -------------------------------------------------------
     *
     * Only positive quantities are returned.
     *
     * ALLOCATED records are included because your current
     * ItemJournalService stores stock allocation information
     * in this table.
     *
     * If your application has a dedicated inventory balance
     * table, replace this query with that table.
     * -------------------------------------------------------
     */

    const query = `
      SELECT
        ia.id,

        ia.item_id,
        ia.warehouse_id,

        ia.warehouse_location_id AS location_id,

        wl.title AS location_name,

        ia.batch_no,

        ia.bin_code AS serial_no,

        TO_CHAR(
          ia.date_received,
          'YYYY-MM-DD'
        ) AS date_received,

        TO_CHAR(
          ia.prod_date,
          'YYYY-MM-DD'
        ) AS prod_date,

        TO_CHAR(
          ia.expiry_date,
          'YYYY-MM-DD'
        ) AS expiry_date,

        ia.allocated_quantity,

        ia.unit_cost,

        ia.total_cost,

        ia.status,

        ia.created_at

      FROM inventory_allocations ia

      LEFT JOIN warehouse_locations wl
        ON wl.id = ia.warehouse_location_id
       AND wl.company_id = ia.company_id

      WHERE ia.company_id = $1
        AND ia.item_id = $2
        AND ia.warehouse_id = $3

        ${locationCondition}

        AND COALESCE(
          ia.allocated_quantity,
          0
        ) > 0

        AND UPPER(
          COALESCE(ia.status, '')
        ) IN (
          'ALLOCATED',
          'AVAILABLE',
          'OPEN',
          'ACTIVE'
        )

      ORDER BY
        CASE
          WHEN ia.expiry_date IS NULL THEN 1
          ELSE 0
        END ASC,

        ia.expiry_date ASC,

        ia.date_received ASC,

        ia.created_at ASC,

        ia.id ASC
    `;

    const result = await pool.query(query, values);

    /**
     * -------------------------------------------------------
     * Normalize response
     * -------------------------------------------------------
     *
     * This shape matches StockSequenceRecord used by:
     *
     * useItemJournal.ts
     *
     * Specifically:
     *
     * location_id
     * location_name
     * batch_no
     * sequence_no
     * serial_no
     * date_received
     * prod_date
     * expiry_date
     * available_quantity
     * -------------------------------------------------------
     */

    const sequences = result.rows.map((row) => {
      const availableQuantity = Number(row.allocated_quantity || 0);

      const unitCost = Number(row.unit_cost || 0);

      const totalCost = Number(row.total_cost || 0);

      /**
       * There is no sequence_no column in the schema
       * supplied in your ItemJournalService.
       *
       * Use the allocation id as a stable sequence key.
       *
       * Example:
       *
       * SEQ-2f8c...
       */
      const sequenceNo = row.id ? `SEQ-${String(row.id)}` : "";

      return {
        id: String(row.id),

        item_id: String(row.item_id || itemId),

        warehouse_id: String(row.warehouse_id || warehouseId),

        location_id: row.location_id
          ? String(row.location_id)
          : locationId || "",

        location_name: row.location_name ? String(row.location_name) : "",

        batch_no: row.batch_no ? String(row.batch_no) : "",

        sequence_no: sequenceNo,

        serial_no: row.serial_no ? String(row.serial_no) : "",

        date_received: row.date_received ? String(row.date_received) : "",

        prod_date: row.prod_date ? String(row.prod_date) : "",

        expiry_date: row.expiry_date ? String(row.expiry_date) : "",

        available_quantity: Number.isFinite(availableQuantity)
          ? availableQuantity
          : 0,

        unit_cost: Number.isFinite(unitCost) ? unitCost : 0,

        total_cost: Number.isFinite(totalCost) ? totalCost : 0,

        status: row.status ? String(row.status) : "",
      };
    });

    return NextResponse.json(
      {
        success: true,

        data: sequences,

        count: sequences.length,
      },
      {
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("Get Stock Sequences Exception:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load stock sequences.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
