// app/api/reports/inv-pur-supp/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface PurchaseEntry {
  id: string;
  invoice_no: string;
  supplier_no: string;
  supplier_name: string;
  uom: string;
  quantity: number;
  amount_lcy: number;
  amount_incl_vat: number;
}

interface PurchaseGroup {
  item_id: string;
  item_no: string;
  description: string;
  total_qty: number;
  total_amount_lcy: number;
  total_amount_incl_vat: number;
  entries: PurchaseEntry[];
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
    const supplierIdsParam = searchParams.get("supplierIds");
    const reportType = searchParams.get("reportType") || "Detailed";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and End date parameters are mandatory." },
        { status: 400 }
      );
    }

    const queryParams: unknown[] = [companyId, startDate, endDate];
    const whereConditions: string[] = [
      "pr.company_id = $1",
      "pr.posting_date::date >= $2::date",
      "pr.posting_date::date <= $3::date",
    ];

    if (itemIdsParam) {
      const itemIds = itemIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (itemIds.length > 0) {
        queryParams.push(itemIds);
        whereConditions.push(`prl.item_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    if (supplierIdsParam) {
      const supplierIds = supplierIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (supplierIds.length > 0) {
        queryParams.push(supplierIds);
        whereConditions.push(`pr.vendor_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    const purchasesQuery = `
      SELECT 
        prl.id,
        COALESCE(pr.receipt_no, '-') AS invoice_no,
        COALESCE(v.customer_code, v.id::text) AS supplier_no,
        COALESCE(v.name, 'Unknown Supplier') AS supplier_name,
        COALESCE(u.name, 'Pcs') AS uom,
        prl.quantity,
        prl.total_cost AS amount_lcy,
        (prl.total_cost * 1.2) AS amount_incl_vat,
        i.id AS item_id,
        i.item_code AS item_no,
        i.name AS description
      FROM purchase_receipt_lines prl
      JOIN purchase_receipts pr ON pr.id = prl.purchase_receipt_id
      JOIN items i ON i.id = prl.item_id
      LEFT JOIN units_of_measure u ON u.id = i.base_uom_id
      LEFT JOIN parties v ON v.id = pr.vendor_id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY i.item_code ASC, pr.posting_date ASC
    `;

    const result = await pool.query(purchasesQuery, queryParams);
    const groupedData: Record<string, PurchaseGroup> = {};

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
          invoice_no: row.invoice_no,
          supplier_no: row.supplier_no,
          supplier_name: row.supplier_name,
          uom: row.uom,
          quantity: qty,
          amount_lcy: amtLcy,
          amount_incl_vat: amtInclVat,
        });
      }
    });

    // For Summary report mode, aggregate or list distinct summary lines per supplier if needed
    if (reportType === "Summary") {
      Object.values(groupedData).forEach((group) => {
        const supplierMap: Record<string, PurchaseEntry> = {};
        group.entries.forEach((entry) => {
          if (!supplierMap[entry.supplier_no]) {
            supplierMap[entry.supplier_no] = { ...entry, invoice_no: "" };
          } else {
            supplierMap[entry.supplier_no].quantity += entry.quantity;
            supplierMap[entry.supplier_no].amount_lcy += entry.amount_lcy;
            supplierMap[entry.supplier_no].amount_incl_vat += entry.amount_incl_vat;
          }
        });
        group.entries = Object.values(supplierMap);
      });
    }

    return NextResponse.json({
      success: true,
      data: Object.values(groupedData),
    });
  } catch (err) {
    const error = err as Error;
    console.error("Item Purchases By Supplier Report Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate Item Purchases Report" },
      { status: 500 }
    );
  }
}