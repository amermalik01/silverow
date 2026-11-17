// app/api/reports/stock-availability/route.ts


import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

/* =========================================================
   TYPES
========================================================= */

type NumericValue = number | string | null;

type ReportMode = "summary" | "detailed";
type ShowResultsBy = "By Item" | "By Warehouse";

interface StockTotalRow extends QueryResultRow {
  warehouse_id: string;
  warehouse_name: string;
  item_id: string;
  item_code: string;
  description: string;
  uom: string;
  current_qty: NumericValue;
  allocated_qty: NumericValue;
  available_qty: NumericValue;
  unit_cost: NumericValue;
  total_value: NumericValue;
}

interface DetailedRow extends StockTotalRow {
  entry_id: string;
  batch_no: string | null;
  serial_no: string | null;
  doc_type: string;
  received_qty: NumericValue;
  sold_qty: NumericValue;
  physical_qty: NumericValue;
  date_received: string | null;
  expiry_date: string | null;
  entry_unit_cost: NumericValue;
  entry_total_value: NumericValue;
  is_first_layer: boolean;
}

interface StockReportEntry {
  id?: string;

  item_id: string;
  item_code: string;
  description: string;
  uom: string;

  warehouse_id: string;
  warehouse_name: string;

  // Summary values
  current_qty: number;
  allocated_qty: number;
  available_qty: number;

  unit_cost: number;
  total_value: number;

  // Detailed values
  consignment_no?: string | null;
  ref_no?: string | null;
  frame_no?: string | null;
  doc_type?: string;
  received_qty?: number;
  sold_qty?: number;
  date_received?: string | null;
  expiry_date?: string | null;
}

interface StockGroup {
  group_type: "item" | "warehouse";
  group_id: string;
  group_name: string;

  // Kept for compatibility with warehouse-grouped consumers.
  warehouse_id?: string;
  warehouse_name?: string;

  total_stock_qty: number;
  total_allocated_qty: number;
  total_available_qty: number;
  total_stock_value: number;

  entries: StockReportEntry[];
}

/* =========================================================
   HELPERS
========================================================= */

const toNumber = (value: NumericValue): number => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

const parseIds = (value: string | null): string[] => {
  if (!value) return [];

  return [
    ...new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
};

/* =========================================================
   API
========================================================= */

export async function GET(req: NextRequest) {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const asOfDate = searchParams.get("asOfDate");

    const itemIds = parseIds(searchParams.get("itemIds"));
    const warehouseIds = parseIds(searchParams.get("warehouseIds"));

    const requestedMode = searchParams.get("mode");
    const mode: ReportMode =
      requestedMode === "summary" ? "summary" : "detailed";

    const requestedGrouping = searchParams.get("showResultsBy");

    const showResultsBy: ShowResultsBy =
      requestedGrouping === "By Item"
        ? "By Item"
        : "By Warehouse";

    const byValue = searchParams.get("byValue") === "true";

    if (!asOfDate || !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
      return NextResponse.json(
        {
          success: false,
          error: "'Date' parameter is mandatory and must be YYYY-MM-DD.",
        },
        { status: 400 },
      );
    }

    // Validate that the supplied date is a real calendar date.
    const parsedDate = new Date(`${asOfDate}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== asOfDate
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid report date." },
        { status: 400 },
      );
    }

    await client.query(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );

    transactionStarted = true;

    /* =====================================================
       QUERY PARAMETERS
    ===================================================== */

    const queryParams: unknown[] = [companyId, asOfDate];

    let itemFilter = "";
    let warehouseFilter = "";

    if (itemIds.length > 0) {
      queryParams.push(itemIds);

      itemFilter = `
        AND ile.item_id = $${queryParams.length}::uuid[]
      `.replace(
        "ile.item_id =",
        "ile.item_id =",
      );

      // Use ANY rather than comparing UUID with an array.
      itemFilter = `
        AND ile.item_id = ANY($${queryParams.length}::uuid[])
      `;
    }

    if (warehouseIds.length > 0) {
      queryParams.push(warehouseIds);

      warehouseFilter = `
        AND ile.warehouse_id = ANY($${queryParams.length}::uuid[])
      `;
    }

    const allocationItemFilter =
      itemIds.length > 0
        ? `AND ia.item_id = ANY($${queryParams.length - (warehouseIds.length > 0 ? 1 : 0)}::uuid[])`
        : "";

    const allocationWarehouseFilter =
      warehouseIds.length > 0
        ? `AND sol.warehouse_id = ANY($${queryParams.length}::uuid[])`
        : "";

    /* =====================================================
       COMMON STOCK QUERY

       Physical quantity:
         IN - OUT

       Physical value:
         IN cost - OUT cost

       Allocated quantity:
         Outstanding sales-order reservations only.
    ===================================================== */

    const stockCte = `
      WITH ledger_movements AS (
        SELECT
          ile.id,
          ile.company_id,
          ile.item_id,
          ile.warehouse_id,
          ile.direction,
          ile.quantity,
          ile.total_cost,
          ile.unit_cost,
          ile.batch_no,
          ile.serial_no,
          ile.transaction_type,
          ile.posting_date,
          ile.expiry_date,
          ile.created_at

        FROM inventory_ledger_entries ile

        WHERE ile.company_id = $1
          AND ile.posting_date::date <= $2::date
          AND ile.status <> 'CANCELLED'
          ${itemFilter}
          ${warehouseFilter}
      ),

      physical_stock AS (
        SELECT
          lm.company_id,
          lm.item_id,
          lm.warehouse_id,

          SUM(
            CASE
              WHEN lm.direction = 'IN'
                THEN lm.quantity
              ELSE -lm.quantity
            END
          ) AS physical_qty,

          SUM(
            CASE
              WHEN lm.direction = 'IN'
                THEN lm.total_cost
              ELSE -lm.total_cost
            END
          ) AS total_value,

          SUM(
            CASE
              WHEN lm.direction = 'IN'
                THEN lm.quantity
              ELSE 0
            END
          ) AS received_qty,

          SUM(
            CASE
              WHEN lm.direction = 'OUT'
                THEN lm.quantity
              ELSE 0
            END
          ) AS sold_qty,

          MIN(
            CASE
              WHEN lm.direction = 'IN'
                THEN lm.posting_date
              ELSE NULL
            END
          ) AS date_received,

          MAX(lm.expiry_date) AS expiry_date

        FROM ledger_movements lm

        GROUP BY
          lm.company_id,
          lm.item_id,
          lm.warehouse_id
      ),

      /*
       * Only outstanding sales-order reservations.
       *
       * Do not count posted consumption allocations.
       * Do not count cancelled allocations.
       * Do not count non-sales allocations.
       *
       * Cap allocation totals by the remaining
       * reserved quantity maintained on the SO line.
       */
      reservation_totals AS (
        SELECT
          ia.company_id,
          ia.item_id,
          sol.warehouse_id,
          sol.id AS sales_order_line_id,

          SUM(ia.allocated_quantity) AS allocation_quantity,

          GREATEST(
            COALESCE(sol.quantity_reserved, 0),
            0
          ) AS remaining_reserved_quantity

        FROM inventory_allocations ia

        INNER JOIN sales_order_lines sol
          ON sol.id = ia.sales_order_line_id
         AND sol.company_id = ia.company_id

        INNER JOIN sales_orders so
          ON so.id = sol.sales_order_id
         AND so.company_id = sol.company_id

        WHERE ia.company_id = $1
          AND ia.status = 'ACTIVE'
          AND ia.outbound_entry_id IS NULL
          AND ia.inbound_entry_id IS NULL
          AND ia.source_allocation_id IS NOT NULL
          AND ia.sales_order_line_id IS NOT NULL
          AND COALESCE(sol.is_deleted, false) = false

          ${allocationItemFilter}
          ${allocationWarehouseFilter}

        GROUP BY
          ia.company_id,
          ia.item_id,
          sol.id,
          sol.warehouse_id,
          sol.quantity_reserved
      ),

      allocation_summary AS (
        SELECT
          company_id,
          item_id,
          warehouse_id,

          SUM(
            LEAST(
              allocation_quantity,
              remaining_reserved_quantity
            )
          ) AS allocated_qty

        FROM reservation_totals

        GROUP BY
          company_id,
          item_id,
          warehouse_id
      ),

      stock_totals AS (
        SELECT
          ps.company_id,
          ps.item_id,
          ps.warehouse_id,

          COALESCE(ps.physical_qty, 0) AS current_qty,

          COALESCE(als.allocated_qty, 0) AS allocated_qty,

          GREATEST(
            COALESCE(ps.physical_qty, 0)
            - COALESCE(als.allocated_qty, 0),
            0
          ) AS available_qty,

          COALESCE(ps.total_value, 0) AS total_value,

          CASE
            WHEN COALESCE(ps.physical_qty, 0) > 0
            THEN
              COALESCE(ps.total_value, 0)
              / NULLIF(ps.physical_qty, 0)
            ELSE 0
          END AS unit_cost

        FROM physical_stock ps

        LEFT JOIN allocation_summary als
          ON als.company_id = ps.company_id
         AND als.item_id = ps.item_id
         AND als.warehouse_id = ps.warehouse_id
      )
    `;

    /* =====================================================
       STOCK TOTALS

       One row per warehouse/item.

       This is the authoritative source for all report
       totals in both Summary and Detailed modes.
    ===================================================== */

    const totalsQuery = `
      ${stockCte}

      SELECT
        st.warehouse_id,
        w.name AS warehouse_name,

        st.item_id,
        i.item_code,
        i.name AS description,

        COALESCE(u.name, 'Pcs') AS uom,

        st.current_qty,
        st.allocated_qty,
        st.available_qty,

        st.unit_cost,
        st.total_value

      FROM stock_totals st

      INNER JOIN warehouses w
        ON w.id = st.warehouse_id
       AND w.company_id = st.company_id

      INNER JOIN items i
        ON i.id = st.item_id
       AND i.company_id = st.company_id

      LEFT JOIN uoms u
        ON u.id = i.base_uom_id

      ORDER BY
        w.name ASC,
        i.item_code ASC
    `;

    const totalsResult = await client.query<StockTotalRow>(
      totalsQuery,
      queryParams,
    );

    /* =====================================================
       GROUP BUILDING

       By Item:
         One group per item.
         Rows represent warehouses.

       By Warehouse:
         One group per warehouse.
         Rows represent items.
    ===================================================== */

    const groupedData: Record<string, StockGroup> = {};

    const createGroup = (row: StockTotalRow): StockGroup => {
      const groupType =
        showResultsBy === "By Item" ? "item" : "warehouse";

      const groupId =
        groupType === "item"
          ? row.item_id
          : row.warehouse_id;

      const groupName =
        groupType === "item"
          ? `${row.item_code} - ${row.description}`
          : row.warehouse_name;

      return {
        group_type: groupType,
        group_id: groupId,
        group_name: groupName,

        ...(groupType === "warehouse"
          ? {
              warehouse_id: row.warehouse_id,
              warehouse_name: row.warehouse_name,
            }
          : {}),

        total_stock_qty: 0,
        total_allocated_qty: 0,
        total_available_qty: 0,
        total_stock_value: 0,

        entries: [],
      };
    };

    const addTotals = (
      group: StockGroup,
      row: StockTotalRow,
    ) => {
      group.total_stock_qty += toNumber(row.current_qty);
      group.total_allocated_qty += toNumber(row.allocated_qty);
      group.total_available_qty += toNumber(row.available_qty);
      group.total_stock_value += toNumber(row.total_value);
    };

    const createEntry = (
      row: StockTotalRow,
    ): StockReportEntry => ({
      item_id: row.item_id,
      item_code: row.item_code,
      description: row.description,
      uom: row.uom,

      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouse_name,

      current_qty: toNumber(row.current_qty),
      allocated_qty: toNumber(row.allocated_qty),
      available_qty: toNumber(row.available_qty),

      unit_cost: toNumber(row.unit_cost),
      total_value: toNumber(row.total_value),
    });

    for (const row of totalsResult.rows) {
      const groupId =
        showResultsBy === "By Item"
          ? row.item_id
          : row.warehouse_id;

      if (!groupedData[groupId]) {
        groupedData[groupId] = createGroup(row);
      }

      const group = groupedData[groupId];

      addTotals(group, row);

      group.entries.push(createEntry(row));
    }

    /* =====================================================
       DETAILED MODE

       Preserve individual ledger movement information.

       Allocation and available quantities are warehouse/item
       totals, not batch/serial allocations.

       Therefore they are displayed once per warehouse/item
       instead of being repeated on every ledger layer.
    ===================================================== */

    if (mode === "detailed") {
      const detailedQuery = `
        ${stockCte},

        detailed_movements AS (
          SELECT
            lm.*,

            ROW_NUMBER() OVER (
              PARTITION BY
                lm.warehouse_id,
                lm.item_id

              ORDER BY
                lm.posting_date ASC,
                lm.created_at ASC,
                lm.id ASC
            ) AS layer_number

          FROM ledger_movements lm
        )

        SELECT
          dm.id AS entry_id,

          dm.warehouse_id,
          w.name AS warehouse_name,

          dm.item_id,
          i.item_code,
          i.name AS description,

          COALESCE(u.name, 'Pcs') AS uom,

          dm.batch_no,
          dm.serial_no,
          dm.transaction_type AS doc_type,

          CASE
            WHEN dm.direction = 'IN'
              THEN dm.quantity
            ELSE 0
          END AS received_qty,

          CASE
            WHEN dm.direction = 'OUT'
              THEN dm.quantity
            ELSE 0
          END AS sold_qty,

          CASE
            WHEN dm.direction = 'IN'
              THEN dm.quantity
            ELSE -dm.quantity
          END AS physical_qty,

          TO_CHAR(
            dm.posting_date,
            'YYYY-MM-DD'
          ) AS date_received,

          TO_CHAR(
            dm.expiry_date,
            'YYYY-MM-DD'
          ) AS expiry_date,

          dm.unit_cost AS entry_unit_cost,

          CASE
            WHEN dm.direction = 'IN'
              THEN dm.total_cost
            ELSE -dm.total_cost
          END AS entry_total_value,

          st.current_qty,
          st.allocated_qty,
          st.available_qty,
          st.unit_cost,
          st.total_value,

          (dm.layer_number = 1) AS is_first_layer

        FROM detailed_movements dm

        INNER JOIN stock_totals st
          ON st.item_id = dm.item_id
         AND st.warehouse_id = dm.warehouse_id

        INNER JOIN warehouses w
          ON w.id = dm.warehouse_id
         AND w.company_id = $1

        INNER JOIN items i
          ON i.id = dm.item_id
         AND i.company_id = $1

        LEFT JOIN uoms u
          ON u.id = i.base_uom_id

        ORDER BY
          w.name ASC,
          i.item_code ASC,
          dm.posting_date ASC,
          dm.created_at ASC,
          dm.id ASC
      `;

      const detailedResult = await client.query<DetailedRow>(
        detailedQuery,
        queryParams,
      );

      // Replace summary entries with detailed movement rows.
      for (const group of Object.values(groupedData)) {
        group.entries = [];
      }

      for (const row of detailedResult.rows) {
        const groupId =
          showResultsBy === "By Item"
            ? row.item_id
            : row.warehouse_id;

        const group = groupedData[groupId];

        if (!group) continue;

        const firstLayer = row.is_first_layer;

        group.entries.push({
          id: row.entry_id,

          item_id: row.item_id,
          item_code: row.item_code,
          description: row.description,
          uom: row.uom,

          warehouse_id: row.warehouse_id,
          warehouse_name: row.warehouse_name,

          current_qty: firstLayer
            ? toNumber(row.current_qty)
            : 0,

          allocated_qty: firstLayer
            ? toNumber(row.allocated_qty)
            : 0,

          available_qty: firstLayer
            ? toNumber(row.available_qty)
            : 0,

          unit_cost: toNumber(row.entry_unit_cost),
          total_value: toNumber(row.entry_total_value),

          consignment_no: null,
          ref_no: row.batch_no,
          frame_no: row.serial_no,

          doc_type: row.doc_type,

          received_qty: toNumber(row.received_qty),
          sold_qty: toNumber(row.sold_qty),

          date_received: row.date_received,
          expiry_date: row.expiry_date,
        });
      }
    }

    const data = Object.values(groupedData);

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,

      filters: {
        asOfDate,
        mode,
        showResultsBy,
        byValue,
        itemIds,
        warehouseIds,
      },

      calculation: {
        physicalStock: "IN - OUT",
        allocatedStock: "Outstanding sales-order reservations",
        availableStock: "MAX(Physical - Allocated, 0)",
        allocationScope: "Warehouse / Item",
        reservationDateBasis: "Current reservation state",
      },

      totals: {
        totalStockQty: data.reduce(
          (sum, group) => sum + group.total_stock_qty,
          0,
        ),

        totalAllocatedQty: data.reduce(
          (sum, group) => sum + group.total_allocated_qty,
          0,
        ),

        totalAvailableQty: data.reduce(
          (sum, group) => sum + group.total_available_qty,
          0,
        ),

        totalStockValue: data.reduce(
          (sum, group) => sum + group.total_stock_value,
          0,
        ),
      },

      data,
    });
  } catch (err: unknown) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError: unknown) {
        console.error(
          "Stock Availability Report rollback failed:",
          rollbackError,
        );
      }
    }

    const error =
      err instanceof Error
        ? err
        : new Error("Unknown error generating stock availability report");

    console.error("Stock Availability Report Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}


/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface StockDetailEntry {
  id: string;
  item_code: string;
  description: string;
  uom: string;
  consignment_no: string | null;
  ref_no: string | null;
  frame_no: string | null;
  doc_type: string;
  received_qty: number;
  sold_qty: number;
  allocated_qty: number;
  available_qty: number;
  date_received: string | null;
  expiry_date: string | null;
  unit_cost: number;
  total_value: number;
}

interface StockSummaryEntry {
  item_code: string;
  description: string;
  uom: string;
  available_qty: number;
  allocated_qty: number;
  current_qty: number;
  unit_cost: number;
  total_value: number;
}

interface StockGroup {
  warehouse_id: string;
  warehouse_name: string;
  total_stock_qty: number;
  total_allocated_qty: number;
  total_available_qty: number;
  entries: (StockDetailEntry | StockSummaryEntry)[];
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const asOfDate = searchParams.get("asOfDate");
    const itemIdsParam = searchParams.get("itemIds");
    const warehouseIdsParam = searchParams.get("warehouseIds");
    const mode = searchParams.get("mode") || "detailed"; // summary | detailed

    if (!asOfDate) {
      return NextResponse.json(
        { error: "'Date' parameter is mandatory." },
        { status: 400 }
      );
    }

    const queryParams: unknown[] = [companyId, asOfDate];
    const whereConditions: string[] = [
      "ile.company_id = $1",
      "ile.posting_date::date <= $2::date",
    ];

    if (itemIdsParam) {
      const itemIds = itemIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (itemIds.length > 0) {
        queryParams.push(itemIds);
        whereConditions.push(`ile.item_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    if (warehouseIdsParam) {
      const warehouseIds = warehouseIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (warehouseIds.length > 0) {
        queryParams.push(warehouseIds);
        whereConditions.push(`ile.warehouse_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    if (mode === "detailed") {

      const detailedQuery = `
        WITH ledger_summary AS (
          SELECT 
            ile.warehouse_id,
            ile.item_id,
            ile.batch_no AS ref_no, 
            ile.serial_no AS frame_no,
            ile.transaction_type AS doc_type,
            SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE 0 END) AS received_qty,
            SUM(CASE WHEN ile.direction = 'OUT' THEN ile.quantity ELSE 0 END) AS sold_qty,
            SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END) AS physical_qty,
            MIN(ile.posting_date) AS date_received,
            MAX(ile.expiry_date) AS expiry_date,
            SUM(ile.total_cost) AS total_cost,
            ile.id AS entry_id
          FROM inventory_ledger_entries ile
          WHERE ${whereConditions.join(" AND ")}
          GROUP BY 
            ile.warehouse_id, ile.item_id, ile.batch_no, ile.serial_no,
            ile.transaction_type, ile.id
        ),
        
        allocation_summary AS (
          SELECT
              company_id,
              item_id,
              warehouse_id,
              SUM(
                  LEAST(
                      allocation_quantity,
                      remaining_reserved_quantity
                  )
              ) AS allocated_qty
          FROM reservation_totals
          GROUP BY
              company_id,
              item_id,
              warehouse_id
        )
        SELECT 
          w.id AS warehouse_id,
          w.name AS warehouse_name,
          i.id AS item_id,
          i.item_code,
          i.name AS description,
          COALESCE(u.name, 'Pcs') AS uom,
          '' AS consignment_no,          
          ls.ref_no, 
          ls.frame_no,
          ls.doc_type,
          ls.received_qty,
          ls.sold_qty,
          COALESCE(als.allocated_qty, 0) AS allocated_qty,
          GREATEST(0, ls.physical_qty - COALESCE(als.allocated_qty, 0)) AS available_qty,
          ls.date_received,
          ls.expiry_date,
          CASE 
            WHEN ls.physical_qty > 0 
            THEN ls.total_cost / NULLIF(ls.physical_qty, 0)
            ELSE 0 
          END AS unit_cost,
          ls.total_cost AS total_value,
          ls.entry_id
        FROM ledger_summary ls
        JOIN warehouses w ON w.id = ls.warehouse_id
        JOIN items i ON i.id = ls.item_id
        LEFT JOIN uoms u ON u.id = i.base_uom_id
        LEFT JOIN allocation_summary als ON als.warehouse_id = ls.warehouse_id 
          AND als.item_id = ls.item_id 
          AND COALESCE(als.batch_no, '') = COALESCE(ls.ref_no, '')
        ORDER BY w.name ASC, i.item_code ASC
      `;      

      const result = await pool.query(detailedQuery, queryParams);
      const groupedData: Record<string, StockGroup> = {};

      result.rows.forEach((row) => {
        const whKey = row.warehouse_id as string;
        if (!groupedData[whKey]) {
          groupedData[whKey] = {
            warehouse_id: row.warehouse_id,
            warehouse_name: row.warehouse_name,
            total_stock_qty: 0,
            total_allocated_qty: 0,
            total_available_qty: 0,
            entries: [],
          };
        }

        const avail = Number(row.available_qty) || 0;
        const alloc = Number(row.allocated_qty) || 0;
        const stock = avail + alloc;

        groupedData[whKey].total_stock_qty += stock;
        groupedData[whKey].total_allocated_qty += alloc;
        groupedData[whKey].total_available_qty += avail;

        (groupedData[whKey].entries as StockDetailEntry[]).push({
          id: row.entry_id,
          item_code: row.item_code,
          description: row.description,
          uom: row.uom,
          consignment_no:'',
          ref_no: row.ref_no,
          frame_no: row.frame_no,
          doc_type: row.doc_type,
          received_qty: Number(row.received_qty) || 0,
          sold_qty: Number(row.sold_qty) || 0,
          allocated_qty: alloc,
          available_qty: avail,
          date_received: row.date_received,
          expiry_date: row.expiry_date,
          unit_cost: Number(row.unit_cost) || 0,
          total_value: Number(row.total_value) || 0,
        });
      });

      return NextResponse.json({
        success: true,
        data: Object.values(groupedData),
      });
    } else {

      const summaryQuery = `
        WITH ledger_summary AS (
          SELECT 
            ile.warehouse_id,
            ile.item_id,
            SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END) AS physical_qty,
            SUM(ile.total_cost) AS total_cost
          FROM inventory_ledger_entries ile
          WHERE ${whereConditions.join(" AND ")}
          GROUP BY ile.warehouse_id, ile.item_id
        ),
        allocation_summary AS (
            SELECT
                company_id,
                item_id,
                warehouse_id,
                SUM(
                    LEAST(
                        allocation_quantity,
                        remaining_reserved_quantity
                    )
                ) AS allocated_qty
            FROM reservation_totals
            GROUP BY
                company_id,
                item_id,
                warehouse_id
        )
        SELECT 
          w.id AS warehouse_id,
          w.name AS warehouse_name,
          i.id AS item_id,
          i.item_code,
          i.name AS description,
          COALESCE(u.name, 'Pcs') AS uom,
          ls.physical_qty AS current_qty,
          COALESCE(als.allocated_qty, 0) AS allocated_qty,
          GREATEST(0, ls.physical_qty - COALESCE(als.allocated_qty, 0)) AS available_qty,
          CASE 
            WHEN ls.physical_qty > 0 
            THEN ls.total_cost / NULLIF(ls.physical_qty, 0)
            ELSE 0 
          END AS unit_cost,
          ls.total_cost AS total_value
        FROM ledger_summary ls
        JOIN warehouses w ON w.id = ls.warehouse_id
        JOIN items i ON i.id = ls.item_id
        LEFT JOIN uoms u ON u.id = i.base_uom_id
        LEFT JOIN allocation_summary als ON als.warehouse_id = ls.warehouse_id 
          AND als.item_id = ls.item_id
        ORDER BY w.name ASC, i.item_code ASC
      `;      

      const result = await pool.query(summaryQuery, queryParams);
      const groupedData: Record<string, StockGroup> = {};

      result.rows.forEach((row) => {
        const whKey = row.warehouse_id as string;
        if (!groupedData[whKey]) {
          groupedData[whKey] = {
            warehouse_id: row.warehouse_id,
            warehouse_name: row.warehouse_name,
            total_stock_qty: 0,
            total_allocated_qty: 0,
            total_available_qty: 0,
            entries: [],
          };
        }

        const avail = Number(row.available_qty) || 0;
        const alloc = Number(row.allocated_qty) || 0;
        const current = Number(row.current_qty) || 0;

        groupedData[whKey].total_stock_qty += current;
        groupedData[whKey].total_allocated_qty += alloc;
        groupedData[whKey].total_available_qty += avail;

        (groupedData[whKey].entries as StockSummaryEntry[]).push({
          item_code: row.item_code,
          description: row.description,
          uom: row.uom,
          available_qty: avail,
          allocated_qty: alloc,
          current_qty: current,
          unit_cost: Number(row.unit_cost) || 0,
          total_value: Number(row.total_value) || 0,
        });
      });

      return NextResponse.json({
        success: true,
        data: Object.values(groupedData),
      });
    }
  } catch (err) {
    const error = err as Error;
    console.error("Stock Availability Report Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate Stock Availability Report" },
      { status: 500 }
    );
  }
} */
