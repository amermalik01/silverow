// app/api/sales/sales-orders/available-batches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PoolClient } from "pg";

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type AvailableBatchRow = {
  id: string;
  source_allocation_id: string | null;

  company_id: string;
  inbound_entry_id: string | null;

  item_id: string;
  warehouse_id: string;

  location_id: string | null;
  location_name: string | null;

  batch_no: string | null;
  bin_code: string | null;
  serial_no: string | null;

  expiry_date: string | null;

  allocated_quantity: number | string | null;
  reserved_quantity: number | string | null;
  returned_quantity: number | string | null;
  available_quantity: number | string | null;

  unit_cost: number | string | null;

  purchase_order_line_id: string | null;
  purchase_invoice_line_id: string | null;

  received_at: string | Date | null;
};

export async function GET(req: NextRequest) {
  let client: PoolClient | null = null;

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { searchParams } = new URL(req.url);

    const itemId = searchParams.get("item_id");
    const warehouseId = searchParams.get("warehouse_id");
    const currentSalesOrderId =
      searchParams.get("sales_order_id");

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          error: "item_id parameter is required.",
        },
        {
          status: 400,
        },
      );
    }

    client = await pool.connect();

    /**
     * =========================================================
     * QUERY PARAMETERS
     * =========================================================
     */

    const queryParams: string[] = [
      companyId,
      itemId,
    ];

    let warehouseCondition = "";

    if (warehouseId) {
      queryParams.push(warehouseId);

      warehouseCondition = `
        AND ia.warehouse_id = $${queryParams.length}
      `;
    }

    /**
     * =========================================================
     * CURRENT SALES ORDER CONDITION
     * =========================================================
     *
     * When editing an existing Sales Order, allocations
     * belonging to that same Sales Order must NOT reduce the
     * available quantity.
     *
     * Example:
     *
     * Original stock       = 10
     * Current SO reserved  = 4
     *
     * While editing current SO:
     *
     * Available            = 10
     *
     * Another SO reserved  = 3
     *
     * Available            = 7
     */

    let currentSalesOrderCondition = "";

    if (currentSalesOrderId) {
      queryParams.push(currentSalesOrderId);

      currentSalesOrderCondition = `
        AND sol.sales_order_id <> $${queryParams.length}
      `;
    }

    /**
     * =========================================================
     * AVAILABLE INVENTORY QUERY
     * =========================================================
     *
     * inventory_allocations is being used as an allocation
     * lineage tree.
     *
     * ROOT STOCK:
     *
     * source_allocation_id IS NULL
     *
     * SALES ORDER RESERVATION:
     *
     * source_allocation_id = ROOT.id
     *
     * sales_order_line_id = SO line
     *
     * Therefore this query only returns ROOT inventory rows.
     */

    const query = `
      SELECT
        ia.id AS id,

        ia.id AS source_allocation_id,

        ia.company_id,
        ia.inbound_entry_id,

        ia.item_id,
        ia.warehouse_id,

        ia.warehouse_location_id AS location_id,

        wl.title AS location_name,

        ia.batch_no,
        ia.bin_code,

        /*
         * Existing UI expects serial_no.
         * Current inventory allocation model uses bin_code
         * for this value.
         */
        ia.bin_code AS serial_no,

        TO_CHAR(
          ia.expiry_date,
          'YYYY-MM-DD'
        ) AS expiry_date,

        ia.allocated_quantity,

        ia.unit_cost,

        ia.purchase_order_line_id,
        ia.purchase_invoice_line_id,

        ia.created_at AS received_at,

        /*
         * Quantity already returned to supplier through
         * Debit Note.
         */
        COALESCE(
          returned.returned_quantity,
          0
        ) AS returned_quantity,

        /*
         * Quantity currently reserved by OTHER Sales Orders.
         */
        COALESCE(
          reserved.reserved_quantity,
          0
        ) AS reserved_quantity,

        /*
         * Actual quantity available for allocation.
         */
        GREATEST(
          ia.allocated_quantity

          - COALESCE(
              returned.returned_quantity,
              0
            )

          - COALESCE(
              reserved.reserved_quantity,
              0
            ),

          0
        ) AS available_quantity

      FROM inventory_allocations ia

      /*
       * =======================================================
       * WAREHOUSE LOCATION
       * =======================================================
       */

      LEFT JOIN warehouse_locations wl
        ON wl.id = ia.warehouse_location_id
       AND wl.company_id = ia.company_id

      /*
       * =======================================================
       * DEBIT NOTE / PURCHASE RETURN
       * =======================================================
       *
       * These child allocations reduce the quantity available
       * from the original purchase/inbound allocation.
       *
       * Example:
       *
       * ROOT allocation = 10
       * Debit Note       = 2
       *
       * Remaining        = 8
       */

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

      ) returned ON true

      /*
       * =======================================================
       * SALES ORDER RESERVATION
       * =======================================================
       *
       * Every Sales Order reservation MUST contain:
       *
       * source_allocation_id = original inventory allocation id
       *
       * sales_order_line_id = current SO line id
       *
       * Example:
       *
       * ROOT:
       *     id = A
       *
       * SALES ORDER:
       *     id = B
       *     source_allocation_id = A
       *
       * Then B consumes reservation quantity from A.
       */

      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            SUM(r.allocated_quantity),
            0
          ) AS reserved_quantity

        FROM inventory_allocations r

        INNER JOIN sales_order_lines sol
          ON sol.id = r.sales_order_line_id

        WHERE r.company_id = ia.company_id

          AND r.source_allocation_id = ia.id

          AND r.status = 'ACTIVE'

          AND r.sales_order_line_id IS NOT NULL

          AND sol.is_deleted = false

          /*
           * Do not count the current Sales Order's own
           * allocations while editing it.
           */
          ${currentSalesOrderCondition}

      ) reserved ON true

      /*
       * =======================================================
       * ROOT INVENTORY ONLY
       * =======================================================
       *
       * Sales Order child rows cannot appear here because:
       *
       * child.source_allocation_id IS NOT NULL
       */

      WHERE ia.company_id = $1

        AND ia.item_id = $2

        AND ia.status = 'ACTIVE'

        ${warehouseCondition}

        /*
         * Sales Order stock allocation is currently based on
         * inbound inventory.
         */
        AND ia.inbound_entry_id IS NOT NULL

        /*
         * ROOT allocation only.
         */
        AND ia.source_allocation_id IS NULL

        /*
         * Must not already be a Sales Order allocation.
         */
        AND ia.sales_order_line_id IS NULL

        /*
         * Root stock that has itself been consumed by a
         * Debit Note is excluded.
         */
        AND ia.debit_note_line_id IS NULL

        /*
         * Credit Note allocations are not treated as source
         * inventory rows here.
         */
        AND ia.credit_note_line_id IS NULL

        /*
         * Only show stock that actually remains available.
         */
        AND GREATEST(
          ia.allocated_quantity

          - COALESCE(
              returned.returned_quantity,
              0
            )

          - COALESCE(
              reserved.reserved_quantity,
              0
            ),

          0
        ) > 0

      /*
       * =======================================================
       * FIFO / EXPIRY ORDER
       * =======================================================
       */

      ORDER BY

        CASE
          WHEN ia.expiry_date IS NULL THEN 1
          ELSE 0
        END ASC,

        ia.expiry_date ASC,

        ia.created_at ASC,

        ia.id ASC
    `;

    const result =
      await client.query<AvailableBatchRow>(
        query,
        queryParams,
      );

    /**
     * =========================================================
     * MAP DATABASE RESULT
     * =========================================================
     */

    const data = result.rows.map((row) => ({
      id: row.id,

      /*
       * IMPORTANT:
       *
       * For a ROOT allocation:
       *
       * source_allocation_id = id
       *
       * This is the value that MUST be sent back to
       * SalesOrderService.saveLineAllocations().
       */
      source_allocation_id:
        row.source_allocation_id || row.id,

      inbound_entry_id:
        row.inbound_entry_id || "",

      item_id:
        row.item_id,

      warehouse_id:
        row.warehouse_id,

      location_id:
        row.location_id || "",

      location_name:
        row.location_name || "",

      batch_no:
        row.batch_no || "",

      bin_code:
        row.bin_code || "",

      serial_no:
        row.serial_no || "",

      expiry_date:
        row.expiry_date || "",

      allocated_quantity:
        Number(row.allocated_quantity) || 0,

      reserved_quantity:
        Number(row.reserved_quantity) || 0,

      returned_quantity:
        Number(row.returned_quantity) || 0,

      available_quantity:
        Number(row.available_quantity) || 0,

      unit_cost:
        Number(row.unit_cost) || 0,

      purchase_order_line_id:
        row.purchase_order_line_id || "",

      purchase_invoice_line_id:
        row.purchase_invoice_line_id || "",

      received_at:
        row.received_at,
    }));

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error(
      "[GET_AVAILABLE_BATCHES_ERROR]:",
      err,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch available inventory batches.",
      },
      {
        status: 500,
      },
    );
  } finally {
    if (client) {
      client.release();
      client = null;
    }
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  let client;

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const itemId = searchParams.get("item_id");
    const warehouseId = searchParams.get("warehouse_id");
    const currentSalesOrderId = searchParams.get("sales_order_id");

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "item_id parameter is required." },
        { status: 400 },
      );
    }

    client = await pool.connect();

    const queryParamsList: (string | number)[] = [companyId, itemId];
    let whereClause = `
      ia.company_id = $1
      AND ia.item_id = $2
      AND ia.status = 'ACTIVE'
      AND ia.debit_note_line_id IS NULL
    `;

    if (warehouseId) {
      queryParamsList.push(warehouseId);
      whereClause += ` AND ia.warehouse_id = $${queryParamsList.length}`;
    }

    let currentSalesOrderCondition = "";

    if (currentSalesOrderId) {
      queryParamsList.push(currentSalesOrderId);

      currentSalesOrderCondition = `
        AND sol.sales_order_id <> $${queryParamsList.length}
      `;
    }

    const query = `
      SELECT
        ia.id AS source_allocation_id,
        ia.id,
        ia.company_id,
        ia.inbound_entry_id,
        ia.item_id,
        ia.warehouse_id,
        ia.warehouse_location_id AS location_id,
        wl.title AS location_name,
        ia.batch_no,
        ia.bin_code,
        ia.bin_code AS serial_no,
        TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        ia.allocated_quantity AS allocated_quantity,
        ia.unit_cost,
        ia.purchase_order_line_id,
        ia.purchase_invoice_line_id,
        ia.created_at AS received_at,
        COALESCE(returned.returned_quantity, 0) AS returned_quantity,

        GREATEST(
          ia.allocated_quantity
          - COALESCE(returned.returned_quantity, 0)
          - COALESCE(reserved.reserved_quantity, 0),
          0
        ) AS available_quantity

      FROM inventory_allocations ia

      LEFT JOIN warehouse_locations wl
        ON wl.id = ia.warehouse_location_id

      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(r.allocated_quantity), 0) AS returned_quantity
        FROM inventory_allocations r
        WHERE r.company_id = ia.company_id
          AND r.source_allocation_id = ia.id
          AND r.status = 'ACTIVE'
          AND r.debit_note_line_id IS NOT NULL
      ) returned ON true

      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(r.allocated_quantity), 0) AS reserved_quantity
        FROM inventory_allocations r
        INNER JOIN sales_order_lines sol ON sol.id = r.sales_order_line_id
        WHERE r.company_id = ia.company_id
          AND r.source_allocation_id = ia.id
          AND r.status = 'ACTIVE'
          AND r.sales_order_line_id IS NOT NULL
          ${currentSalesOrderCondition}
      ) reserved ON true

      WHERE ${whereClause}
        AND ia.source_allocation_id IS NULL
        AND ia.sales_order_line_id IS NULL
        -- AND (ia.allocated_quantity - COALESCE(returned.returned_quantity, 0)) > 0
        AND GREATEST(
            ia.allocated_quantity
            - COALESCE(returned.returned_quantity, 0)
            - COALESCE(reserved.reserved_quantity, 0),
            0
          ) > 0

      ORDER BY 
        CASE WHEN ia.expiry_date IS NULL THEN 1 ELSE 0 END ASC,
        ia.expiry_date ASC,
        ia.created_at ASC,
        ia.id ASC;
    `;

    console.log("sales-orders/available-batches query ==== ", query);
    console.log("queryParamsList ==== ", queryParamsList);

    const result = await client.query(query, queryParamsList);

    const data = result.rows.map((row) => ({
      id: row.id,

      source_allocation_id: row.source_allocation_id,
      inbound_entry_id: row.inbound_entry_id,

      item_id: row.item_id,
      warehouse_id: row.warehouse_id,

      location_id: row.location_id || "",
      location_name: row.location_name || "",

      batch_no: row.batch_no || "",
      bin_code: row.bin_code || "",
      serial_no: row.serial_no || "",

      expiry_date: row.expiry_date || "",

      allocated_quantity: Number(row.allocated_quantity) || 0,

      reserved_quantity: Number(row.reserved_quantity) || 0,

      returned_quantity: Number(row.returned_quantity) || 0,

      available_quantity: Number(row.available_quantity) || 0,

      unit_cost: Number(row.unit_cost) || 0,
      received_at: row.received_at,
    }));

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("[GET_AVAILABLE_BATCHES_ERROR]:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch available inventory batches.",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
} */
