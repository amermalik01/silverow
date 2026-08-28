// app/api/reports/supplier-ageing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface DetailedEntryItem {
  id: string;
  posting_date: string;
  due_date: string | null;
  document_type: string;
  document_no: string;
  description: string;
  currency_code: string;
  outstanding_fcy: number;
  outstanding_lcy: number;
  running_balance_fcy: number;
}

interface VendorGroup {
  vendor_id: string;
  vendor_no: string;
  vendor_name: string;
  currency_code: string;
  entries: DetailedEntryItem[];
  total_lcy: number;
  total_fcy: number;
}

function getSignedAmount(docType: string, amount: number): number {
  const normalizedType = (docType || "").toUpperCase();
  switch (normalizedType) {
    case "PURCHASE_INVOICE":
    case "INVOICE":
      return -Math.abs(amount); // Increases AP liability (credit balance)
    case "PAYMENT":
    case "PURCHASE_DEBIT_NOTE":
    case "DEBIT_NOTE":
    case "REFUND":
      return Math.abs(amount); // Decreases AP liability
    default:
      return amount;
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const asOfDate = searchParams.get("asOfDate");
    const viewMode = searchParams.get("viewMode") || "Summary"; // "Summary" | "Detailed"
    const supplierIdsParam = searchParams.get("supplierIds");

    if (!asOfDate) {
      return NextResponse.json(
        { error: "Date as at is a mandatory parameter." },
        { status: 400 },
      );
    }

    const queryParams: unknown[] = [companyId, asOfDate];
    const whereConditions: string[] = [
      "e.company_id = $1",
      "e.posting_date::date <= $2::date",
      "e.remaining_amount_lcy <> 0", // Only unapplied/open balances
    ];

    if (supplierIdsParam) {
      const supplierIds = supplierIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (supplierIds.length > 0) {
        queryParams.push(supplierIds);
        whereConditions.push(
          `e.vendor_id = ANY($${queryParams.length}::uuid[])`,
        );
      }
    }

    if (viewMode === "Detailed") {
      const detailedQuery = `
        SELECT 
          e.id,
          e.posting_date,
          e.due_date,
          e.document_type,
          e.document_no,
          e.description,
          p.id AS vendor_id,
          p.supplier_code AS vendor_no,
          p.name AS vendor_name,
          COALESCE(c.code, 'GBP') AS currency_code,
          e.exchange_rate,
          e.remaining_amount_fcy,
          e.remaining_amount_lcy
        FROM vendor_ledger_entries e
        LEFT JOIN parties p ON p.id = e.vendor_id
        LEFT JOIN currencies c ON c.id = e.currency_id
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY p.name ASC, e.posting_date ASC
      `;

      // console.log("detailedQuery ==== ", detailedQuery);
      // console.log("whereConditions ==== ", whereConditions);
      // console.log("queryParams ==== ", queryParams);

      const result = await pool.query(detailedQuery, queryParams);

      // Group rows by vendor and compute running balance
      //   const groupedData: Record<string, any> = {};
      const groupedData: Record<string, VendorGroup> = {};

      result.rows.forEach((row) => {
        const vendorKey = row.vendor_id;
        if (!groupedData[vendorKey]) {
          groupedData[vendorKey] = {
            vendor_id: row.vendor_id,
            vendor_no: row.vendor_no,
            vendor_name: row.vendor_name,
            currency_code: (row.currency_code || "GBP").toUpperCase(),
            entries: [],
            total_lcy: 0,
            total_fcy: 0,
          };
        }

        const signedFCY = getSignedAmount(
          row.document_type,
          Number(row.remaining_amount_fcy),
        );
        const signedLCY = getSignedAmount(
          row.document_type,
          Number(row.remaining_amount_lcy),
        );

        groupedData[vendorKey].total_fcy += signedFCY;
        groupedData[vendorKey].total_lcy += signedLCY;

        groupedData[vendorKey].entries.push({
          id: row.id,
          posting_date: row.posting_date,
          due_date: row.due_date,
          document_type: row.document_type,
          document_no: row.document_no,
          description: row.description,
          currency_code: (row.currency_code || "GBP").toUpperCase(),
          outstanding_fcy: signedFCY,
          outstanding_lcy: signedLCY,
          running_balance_fcy: groupedData[vendorKey].total_fcy,
        });
      });

      return NextResponse.json({
        success: true,
        viewMode: "Detailed",
        data: Object.values(groupedData),
      });
    }

    // Summary Aging Bucket Query
    const summaryQuery = `
      SELECT 
        p.id AS vendor_id,
        p.supplier_code AS vendor_no,
        p.name AS vendor_name,
        COALESCE(c.code, 'GBP') AS currency_code,
        SUM(e.remaining_amount_lcy) AS total_lcy,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 0 AND 30 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_0_30,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 31 AND 60 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_31_60,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 61 AND 90 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_61_90,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 91 AND 120 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_91_120,
        SUM(CASE WHEN ($2::date - e.posting_date::date) > 120 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_over_120
      FROM vendor_ledger_entries e
      LEFT JOIN parties p ON p.id = e.vendor_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY p.id, p.supplier_code, p.name, c.code
      ORDER BY p.name ASC
    `;

    // console.log("summaryQuery ==== ", summaryQuery);
    // console.log("whereConditions ==== ", whereConditions);
    // console.log("queryParams ==== ", queryParams);

    const result = await pool.query(summaryQuery, queryParams);

    const rows = result.rows.map((r) => ({
      vendor_id: r.vendor_id,
      vendor_no: r.vendor_no,
      vendor_name: r.vendor_name,
      currency_code: (r.currency_code || "GBP").toUpperCase(),
      total: Number(r.total_lcy),
      b0_30: Number(r.bucket_0_30),
      b31_60: Number(r.bucket_31_60),
      b61_90: Number(r.bucket_61_90),
      b91_120: Number(r.bucket_91_120),
      b_over_120: Number(r.bucket_over_120),
    }));

    return NextResponse.json({
      success: true,
      viewMode: "Summary",
      data: rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Supplier Ageing Report" },
      { status: 500 },
    );
  }
}
