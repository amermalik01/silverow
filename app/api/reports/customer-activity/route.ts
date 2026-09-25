// app/api/reports/customer-activity/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

function getSignedAmount(docType: string, amount: number): number {
  const normalizedType = (docType || "").toUpperCase();
  const absAmount = Math.abs(amount);

  if (
    normalizedType.includes("PAYMENT") ||
    normalizedType.includes("VENDOR_PAYMENT") ||
    normalizedType.includes("DEBIT_NOTE") ||
    normalizedType.includes("REFUND")||
    normalizedType.includes("FX_VARIANCE")
  ) {
    return -absAmount; // Liability reductions 
  } else if (
    normalizedType.includes("INVOICE") ||
    normalizedType.includes("PURCHASE")
  ) {
    return absAmount; // Liability additions
  }

  // FX_VARIANCE and Journals respect original sign
  return amount;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const reportType = searchParams.get("reportType") || "By Posting Date";
    const documentType = searchParams.get("documentType") || "All";
    const customerIdsParam = searchParams.get("customerIds");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: fromDate and toDate are mandatory.",
        },
        { status: 400 },
      );
    }

    const queryParams: unknown[] = [companyId];
    const whereConditions: string[] = ["combined.company_id = $1"];

    let dateColumn = "combined.posting_date";
    if (reportType === "By Due Date") {
      dateColumn = "combined.due_date";
    } else if (reportType === "By Created Date") {
      dateColumn = "combined.created_at::date";
    }

    queryParams.push(fromDate);
    whereConditions.push(`${dateColumn} >= $${queryParams.length}`);

    queryParams.push(toDate);
    whereConditions.push(`${dateColumn} <= $${queryParams.length}`);

    if (documentType && documentType !== "All") {
      let targetTypes: string[] = [];

      switch (documentType) {
        case "Purchase Invoices":
          targetTypes = ["PURCHASE_INVOICE", "INVOICE"];
          break;
        case "Debit Notes":
          targetTypes = ["PURCHASE_DEBIT_NOTE", "DEBIT_NOTE"];
          break;
        case "Journals":
          targetTypes = [
            "JOURNAL",
            "GENERAL_JOURNAL",
            "VENDOR_JOURNAL",
            "FX_VARIANCE",
          ];
          break;
        default:
          targetTypes = [documentType.toUpperCase()];
          break;
      }

      queryParams.push(targetTypes);
      whereConditions.push(
        `UPPER(combined.document_type) = ANY($${queryParams.length}::text[])`,
      );
    }

    if (customerIdsParam) {
      const customerIds = customerIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (customerIds.length > 0) {
        queryParams.push(customerIds);
        whereConditions.push(
          `combined.customer_id = ANY($${queryParams.length}::uuid[])`,
        );
      }
    }

    const query = `
      WITH combined_activity AS (
        -- Standard Vendor Ledger Entries
        SELECT 
          e.id,
          e.company_id,
          e.customer_id,
          e.posting_date,
          e.due_date,
          e.document_type,
          e.document_no,
          e.description,
          e.currency_id,
          e.exchange_rate,
          e.original_amount_fcy,
          e.remaining_amount_fcy,
          e.original_amount_lcy,
          e.remaining_amount_lcy,
          e.is_open,
          e.on_hold,
          e.on_hold_reason,
          e.created_at
        FROM customer_ledger_entries e

        UNION ALL

        -- Realised/Unrealised FX Variance Records from General Ledger
        SELECT 
          gl.id,
          gl.company_id,
          gl.party_id AS customer_id,
          gl.posting_date,
          gl.posting_date AS due_date,
          'FX_VARIANCE' AS document_type,
          gl.document_no,
          gl.description,
          gl.currency_id AS currency_id,
          1.0 AS exchange_rate,
          0 AS original_amount_fcy,
          0 AS remaining_amount_fcy,
          (gl.debit - gl.credit) AS original_amount_lcy,
          0 AS remaining_amount_lcy,
          false AS is_open,
          false AS on_hold,
          '' AS on_hold_reason,
          gl.posted_at AS created_at
        FROM gl_ledger_entries gl
        WHERE gl.party_type::text = 'customer' AND gl.source_type::text = 'FX_VARIANCE'
      )
      SELECT 
        combined.id,
        combined.posting_date,
        combined.due_date,
        combined.document_type,
        combined.document_no,
        combined.description,
        p.customer_code AS vendor_no,
        p.name AS vendor_name,
        COALESCE(c.code, 'GBP') AS currency_code,
        combined.exchange_rate,
        combined.original_amount_fcy,
        combined.remaining_amount_fcy,
        combined.original_amount_lcy,
        combined.remaining_amount_lcy,
        combined.is_open,
        combined.on_hold,
        combined.on_hold_reason,
        combined.created_at
      FROM combined_activity combined
      LEFT JOIN parties p ON p.id = combined.customer_id
      LEFT JOIN currencies c ON c.id = combined.currency_id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY combined.posting_date DESC, combined.created_at DESC
    `;

    // console.log("query ===", query);
    // console.log("queryParams ===", queryParams);

    const result = await pool.query(query, queryParams);

    const rows = result.rows.map((row) => {
      const rate = Number(row.exchange_rate) || 1.0;
      const rawFCY = Number(row.original_amount_fcy) || 0;
      const rawRemFCY = Number(row.remaining_amount_fcy) || 0;
      const rawLCY = Number(row.original_amount_lcy) || 0;
      const rawRemLCY = Number(row.remaining_amount_lcy) || 0;

      return {
        ...row,
        currency_code: (row.currency_code || "GBP").toUpperCase(),
        exchange_rate: rate,
        original_amount_fcy: getSignedAmount(row.document_type, rawFCY),
        remaining_amount_fcy: getSignedAmount(row.document_type, rawRemFCY),
        amount_lcy: getSignedAmount(row.document_type, rawLCY),
        remaining_amount_lcy: getSignedAmount(row.document_type, rawRemLCY),
        on_hold: Boolean(row.on_hold),
        on_hold_reason: row.on_hold_reason || "",
      };
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Customer Activity Report data" },
      { status: 500 },
    );
  }
}
