// app/api/reports/inv-fig-item/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface SalesFigureEntry {
  id: string;
  posting_date: string;
  doc_type: string;
  doc_no: string;
  customer_name: string;
  salesperson: string;
  quantity: number;
  uom: string;
  unit_price: number;
  amount_lcy: number;
  amount_incl_vat: number;
}

interface SalesFigureGroup {
  item_id: string;
  item_no: string;
  description: string;
  total_qty: number;
  total_amount_lcy: number;
  total_amount_incl_vat: number;
  entries: SalesFigureEntry[];
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const itemIdsParam = searchParams.get("itemIds");
    const customerIdsParam = searchParams.get("customerIds");
    const salespersonIdsParam = searchParams.get("salespersonIds");
    const reportType = searchParams.get("reportType") || "Detailed";
    const showUnposted = searchParams.get("showUnposted") === "true";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and End date parameters are mandatory." },
        { status: 400 }
      );
    }

    const queryParams: unknown[] = [companyId, startDate, endDate];
    const whereConditions: string[] = [
      "ile.company_id = $1",
      "ile.posting_date::date >= $2::date",
      "ile.posting_date::date <= $3::date",
      "ile.direction = 'OUT'",
    ];

    if (showUnposted) {
      whereConditions.push("ile.status = 'OPEN'");
    } else {
      whereConditions.push("ile.status = 'CLOSED'");
    }

    if (itemIdsParam) {
      const itemIds = itemIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (itemIds.length > 0) {
        queryParams.push(itemIds);
        whereConditions.push(`ile.item_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    if (customerIdsParam) {
      const customerIds = customerIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (customerIds.length > 0) {
        queryParams.push(customerIds);
        whereConditions.push(`cle.customer_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    if (salespersonIdsParam) {
      const salespersonIds = salespersonIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (salespersonIds.length > 0) {
        queryParams.push(salespersonIds);
        whereConditions.push(`p.salesperson_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    const salesQuery = `
      SELECT 
        ile.id,
        ile.posting_date,
        COALESCE(ile.transaction_type, 'Sales Shipment') AS doc_type,
        COALESCE(ile.reference_id::text, '-') AS doc_no,
        COALESCE(cust.name, 'Walk-in Customer') AS customer_name,
        'Andrea King' AS salesperson,
        ile.quantity,
        COALESCE(u.name, 'Pcs') AS uom,
        ile.unit_cost AS unit_price,
        ile.total_cost AS amount_lcy,
        (ile.total_cost * 1.2) AS amount_incl_vat,
        i.id AS item_id,
        i.item_code AS item_no,
        i.name AS description
      FROM inventory_ledger_entries ile
      JOIN items i ON i.id = ile.item_id
      LEFT JOIN uoms u ON u.id = i.base_uom_id
      LEFT JOIN customer_ledger_entries cle ON cle.journal_line_id = ile.reference_line_id
      LEFT JOIN parties cust ON cust.id = cle.customer_id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY i.item_code ASC, ile.posting_date ASC
    `;

    const result = await pool.query(salesQuery, queryParams);
    const groupedData: Record<string, SalesFigureGroup> = {};

    result.rows.forEach((row) => {
      const itemKey = row.item_id as string;
      if (!groupedData[itemKey]) {
        groupedData[itemKey] = {
          item_id: row.item_id,
          item_no: row.item_no,
          description: row.description,
          total_qty: 0,
          total_amount_lcy: 0,
          total_amount_incl_vat: 0,
          entries: [],
        };
      }

      const qty = Number(row.quantity) || 0;
      const amtLcy = Number(row.amount_lcy) || 0;
      const amtInclVat = Number(row.amount_incl_vat) || 0;

      groupedData[itemKey].total_qty += qty;
      groupedData[itemKey].total_amount_lcy += amtLcy;
      groupedData[itemKey].total_amount_incl_vat += amtInclVat;

      if (reportType === "Detailed") {
        groupedData[itemKey].entries.push({
          id: row.id,
          posting_date: row.posting_date,
          doc_type: row.doc_type,
          doc_no: row.doc_no,
          customer_name: row.customer_name || "—",
          salesperson: row.salesperson || "—",
          quantity: qty,
          uom: row.uom,
          unit_price: Number(row.unit_price) || 0,
          amount_lcy: amtLcy,
          amount_incl_vat: amtInclVat,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: Object.values(groupedData),
    });
  } catch (err) {
    const error = err as Error;
    console.error("Sales Figures By Item Report Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate Sales Figures Report" },
      { status: 500 }
    );
  }
}