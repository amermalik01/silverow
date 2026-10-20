// app/api/reports/stock-availability/route.ts

import { NextRequest, NextResponse } from "next/server";
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
            ia.warehouse_id,
            ia.item_id,
            COALESCE(ia.batch_no, '') AS batch_no,
            SUM(ia.allocated_quantity) AS allocated_qty
          FROM inventory_allocations ia
          WHERE ia.company_id = $1 AND ia.status = 'ACTIVE'
          GROUP BY ia.warehouse_id, ia.item_id, ia.batch_no
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
            ia.warehouse_id,
            ia.item_id,
            SUM(ia.allocated_quantity) AS allocated_qty
          FROM inventory_allocations ia
          WHERE ia.company_id = $1 AND ia.status = 'ACTIVE'
          GROUP BY ia.warehouse_id, ia.item_id
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
}
/* 
const detailedQuery = `
        SELECT 
          w.id AS warehouse_id,
          w.name AS warehouse_name,
          i.id AS item_id,
          i.item_code,
          i.name AS description,
          COALESCE(u.name, 'Pcs') AS uom,
          '' AS consignment_no,          
          ile.batch_no AS ref_no, 
          ile.serial_no AS frame_no,
          ile.transaction_type AS doc_type,
          SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE 0 END) AS received_qty,
          SUM(CASE WHEN ile.direction = 'OUT' THEN ile.quantity ELSE 0 END) AS sold_qty,
          0 AS allocated_qty,
          SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END) AS available_qty,
          MIN(ile.posting_date) AS date_received,
          MAX(ile.expiry_date) AS expiry_date,
          CASE 
            WHEN SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END) > 0 
            THEN SUM(ile.total_cost) / NULLIF(SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END), 0)
            ELSE 0 
          END AS unit_cost,
          SUM(ile.total_cost) AS total_value,
          ile.id AS entry_id
        FROM inventory_ledger_entries ile
        JOIN warehouses w ON w.id = ile.warehouse_id
        JOIN items i ON i.id = ile.item_id
        LEFT JOIN uoms u ON u.id = i.base_uom_id
        WHERE ${whereConditions.join(" AND ")}
        GROUP BY 
          w.id, w.name, i.id, i.item_code, i.name, u.name, 
          -- ile.consignment_no, ile.ref_no, ile.frame_no,
          ile.batch_no, ile.serial_no,
          ile.transaction_type, ile.id
        ORDER BY w.name ASC, i.item_code ASC
      `;
*/

/* 
const summaryQuery = `
        SELECT 
          w.id AS warehouse_id,
          w.name AS warehouse_name,
          i.id AS item_id,
          i.item_code,
          i.name AS description,
          COALESCE(u.name, 'Pcs') AS uom,
          SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END) AS available_qty,
          0 AS allocated_qty,
          SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END) AS current_qty,
          CASE 
            WHEN SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END) > 0 
            THEN SUM(ile.total_cost) / NULLIF(SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END), 0)
            ELSE 0 
          END AS unit_cost,
          SUM(ile.total_cost) AS total_value
        FROM inventory_ledger_entries ile
        JOIN warehouses w ON w.id = ile.warehouse_id
        JOIN items i ON i.id = ile.item_id
        LEFT JOIN uoms u ON u.id = i.base_uom_id
        WHERE ${whereConditions.join(" AND ")}
        GROUP BY w.id, w.name, i.id, i.item_code, i.name, u.name
        ORDER BY w.name ASC, i.item_code ASC
      `;

*/