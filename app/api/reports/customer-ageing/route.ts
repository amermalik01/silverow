// app/api/reports/customer-ageing/route.ts

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
  customer_id: string;
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
    const customerIdsParam = searchParams.get("customerIds");

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

    if (customerIdsParam) {
      const customerIds = customerIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (customerIds.length > 0) {
        queryParams.push(customerIds);
        whereConditions.push(
          `e.customer_id = ANY($${queryParams.length}::uuid[])`,
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
          p.id AS customer_id,
          p.customer_code AS vendor_no,
          p.name AS vendor_name,
          COALESCE(c.code, 'GBP') AS currency_code,
          e.exchange_rate,
          e.remaining_amount_fcy,
          e.remaining_amount_lcy
        FROM customer_ledger_entries e
        LEFT JOIN parties p ON p.id = e.customer_id
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
        const vendorKey = row.customer_id;
        if (!groupedData[vendorKey]) {
          groupedData[vendorKey] = {
            customer_id: row.customer_id,
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

      // Calculate Bottom Multi-Currency Summary for Detailed View
      let grandTotalLCY = 0;
      const currencyTotals: Record<string, number> = {};

      Object.values(groupedData).forEach((group) => {
        grandTotalLCY += group.total_lcy;
        const cCode = group.currency_code;
        currencyTotals[cCode] = (currencyTotals[cCode] || 0) + group.total_fcy;
      });

      const formattedCurrencyTotals = Object.entries(currencyTotals).map(
        ([code, total]) => ({
          currency_code: code,
          total,
        }),
      );

      return NextResponse.json({
        success: true,
        viewMode: "Detailed",
        data: Object.values(groupedData),
        summaryTotals: {
          total_lcy: grandTotalLCY,
          currencies: formattedCurrencyTotals,
        },
      });
    }

    // SQL Expression to handle document type signage in Summary aggregations
    const signedLcyExpr = `
      CASE 
        WHEN UPPER(e.document_type) IN ('PURCHASE_INVOICE', 'INVOICE') THEN -ABS(e.remaining_amount_lcy)
        WHEN UPPER(e.document_type) IN ('PAYMENT', 'PURCHASE_DEBIT_NOTE', 'DEBIT_NOTE', 'REFUND') THEN ABS(e.remaining_amount_lcy)
        ELSE e.remaining_amount_lcy 
      END
    `;

    const signedFcyExpr = `
      CASE 
        WHEN UPPER(e.document_type) IN ('PURCHASE_INVOICE', 'INVOICE') THEN -ABS(e.remaining_amount_fcy)
        WHEN UPPER(e.document_type) IN ('PAYMENT', 'PURCHASE_DEBIT_NOTE', 'DEBIT_NOTE', 'REFUND') THEN ABS(e.remaining_amount_fcy)
        ELSE e.remaining_amount_fcy 
      END
    `;
    // SUM(e.remaining_amount_lcy) AS total_lcy,
    // SUM(e.remaining_amount_fcy) AS total_fcy,

    // SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 0 AND 30 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_0_30,
    // SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 31 AND 60 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_31_60,
    // SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 61 AND 90 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_61_90,
    // SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 91 AND 120 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_91_120,
    // SUM(CASE WHEN ($2::date - e.posting_date::date) > 120 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_over_120,
    // -- FCY Buckets
    // SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 0 AND 30 THEN e.remaining_amount_fcy ELSE 0 END) AS fcy_bucket_0_30,
    // SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 31 AND 60 THEN e.remaining_amount_fcy ELSE 0 END) AS fcy_bucket_31_60,
    // SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 61 AND 90 THEN e.remaining_amount_fcy ELSE 0 END) AS fcy_bucket_61_90,
    // SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 91 AND 120 THEN e.remaining_amount_fcy ELSE 0 END) AS fcy_bucket_91_120,
    // SUM(CASE WHEN ($2::date - e.posting_date::date) > 120 THEN e.remaining_amount_fcy ELSE 0 END) AS fcy_bucket_over_120

    // Summary Aging Bucket Query
    const summaryQuery = `
      SELECT 
        p.id AS customer_id,
        p.customer_code AS vendor_no,
        p.name AS vendor_name,
        COALESCE(c.code, 'GBP') AS currency_code,

        SUM(${signedLcyExpr}) AS total_lcy,
        SUM(${signedFcyExpr}) AS total_fcy,
        
        -- LCY Buckets
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 0 AND 30 THEN ${signedLcyExpr} ELSE 0 END) AS bucket_0_30,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 31 AND 60 THEN ${signedLcyExpr} ELSE 0 END) AS bucket_31_60,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 61 AND 90 THEN ${signedLcyExpr} ELSE 0 END) AS bucket_61_90,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 91 AND 120 THEN ${signedLcyExpr} ELSE 0 END) AS bucket_91_120,
        SUM(CASE WHEN ($2::date - e.posting_date::date) > 120 THEN ${signedLcyExpr} ELSE 0 END) AS bucket_over_120,
        
        -- FCY Buckets
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 0 AND 30 THEN ${signedFcyExpr} ELSE 0 END) AS fcy_bucket_0_30,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 31 AND 60 THEN ${signedFcyExpr} ELSE 0 END) AS fcy_bucket_31_60,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 61 AND 90 THEN ${signedFcyExpr} ELSE 0 END) AS fcy_bucket_61_90,
        SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 91 AND 120 THEN ${signedFcyExpr} ELSE 0 END) AS fcy_bucket_91_120,
        SUM(CASE WHEN ($2::date - e.posting_date::date) > 120 THEN ${signedFcyExpr} ELSE 0 END) AS fcy_bucket_over_120
      FROM customer_ledger_entries e
      LEFT JOIN parties p ON p.id = e.customer_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY p.id, p.customer_code, p.name, c.code
      ORDER BY p.name ASC
    `;

    // console.log("summaryQuery ==== ", summaryQuery);
    // console.log("whereConditions ==== ", whereConditions);
    // console.log("queryParams ==== ", queryParams);

    const result = await pool.query(summaryQuery, queryParams);

    const rows = result.rows.map((r) => ({
      customer_id: r.customer_id,
      vendor_no: r.vendor_no,
      vendor_name: r.vendor_name,
      currency_code: (r.currency_code || "GBP").toUpperCase(),
      total: Number(r.total_lcy),
      total_fcy: Number(r.total_fcy),
      b0_30: Number(r.bucket_0_30),
      b31_60: Number(r.bucket_31_60),
      b61_90: Number(r.bucket_61_90),
      b91_120: Number(r.bucket_91_120),
      b_over_120: Number(r.bucket_over_120),
      fcy_b0_30: Number(r.fcy_bucket_0_30),
      fcy_b31_60: Number(r.fcy_bucket_31_60),
      fcy_b61_90: Number(r.fcy_bucket_61_90),
      fcy_b91_120: Number(r.fcy_bucket_91_120),
      fcy_b_over_120: Number(r.fcy_bucket_over_120),
    }));

    // Group totals for Summary footer
    const lcyTotalRow = {
      total: 0,
      b0_30: 0,
      b31_60: 0,
      b61_90: 0,
      b91_120: 0,
      b_over_120: 0,
    };

    const currencyTotalsSummary: Record<
      string,
      {
        total: number;
        b0_30: number;
        b31_60: number;
        b61_90: number;
        b91_120: number;
        b_over_120: number;
      }
    > = {};

    rows.forEach((r) => {
      lcyTotalRow.total += r.total;
      lcyTotalRow.b0_30 += r.b0_30;
      lcyTotalRow.b31_60 += r.b31_60;
      lcyTotalRow.b61_90 += r.b61_90;
      lcyTotalRow.b91_120 += r.b91_120;
      lcyTotalRow.b_over_120 += r.b_over_120;

      const code = r.currency_code;
      if (!currencyTotalsSummary[code]) {
        currencyTotalsSummary[code] = {
          total: 0,
          b0_30: 0,
          b31_60: 0,
          b61_90: 0,
          b91_120: 0,
          b_over_120: 0,
        };
      }

      currencyTotalsSummary[code].total += r.total_fcy;
      currencyTotalsSummary[code].b0_30 += r.fcy_b0_30;
      currencyTotalsSummary[code].b31_60 += r.fcy_b31_60;
      currencyTotalsSummary[code].b61_90 += r.fcy_b61_90;
      currencyTotalsSummary[code].b91_120 += r.fcy_b91_120;
      currencyTotalsSummary[code].b_over_120 += r.fcy_b_over_120;
    });

    return NextResponse.json({
      success: true,
      viewMode: "Summary",
      data: rows,
      summaryTotals: {
        lcy: lcyTotalRow,
        currencies: Object.entries(currencyTotalsSummary).map(
          ([code, values]) => ({
            currency_code: code,
            ...values,
          }),
        ),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Customer Ageing Report" },
      { status: 500 },
    );
  }
}

// Summary Aging Bucket Query
// const summaryQuery = `
//   SELECT
//     p.id AS customer_id,
//     p.customer_code AS vendor_no,
//     p.name AS vendor_name,
//     COALESCE(c.code, 'GBP') AS currency_code,
//     SUM(e.remaining_amount_lcy) AS total_lcy,
//     SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 0 AND 30 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_0_30,
//     SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 31 AND 60 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_31_60,
//     SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 61 AND 90 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_61_90,
//     SUM(CASE WHEN ($2::date - e.posting_date::date) BETWEEN 91 AND 120 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_91_120,
//     SUM(CASE WHEN ($2::date - e.posting_date::date) > 120 THEN e.remaining_amount_lcy ELSE 0 END) AS bucket_over_120
//   FROM customer_ledger_entries e
//   LEFT JOIN parties p ON p.id = e.customer_id
//   LEFT JOIN currencies c ON c.id = e.currency_id
//   WHERE ${whereConditions.join(" AND ")}
//   GROUP BY p.id, p.customer_code, p.name, c.code
//   ORDER BY p.name ASC
// `;
