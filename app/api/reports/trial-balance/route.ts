// app/api/reports/trial-balance/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function POST(request: Request) {
  try {
    // 1. Authenticate and verify company context
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      fromDate, 
      toDate, 
      fromAccount, 
      toAccount, 
      viewType, 
      format 
    } = body;

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: "Missing required date parameters" }, { status: 400 });
    }

    // 2. Multi-Period Balance Accumulation Query
    const query = `
      WITH period_activity AS (
          SELECT 
              jel.account_id,
              -- Opening Balances: Summing everything posted prior to the From Date
              SUM(CASE WHEN je.entry_date < $2 THEN jel.debit - jel.credit ELSE 0 END) AS net_opening,
              
              -- Period Changes: Summing activity occurring strictly inside the date window
              SUM(CASE WHEN je.entry_date >= $2 AND je.entry_date <= $3 THEN jel.debit ELSE 0 END) AS period_debit,
              SUM(CASE WHEN je.entry_date >= $2 AND je.entry_date <= $3 THEN jel.credit ELSE 0 END) AS period_credit
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.journal_id = je.id
          WHERE je.company_id = $1 
            AND je.is_posted = TRUE
            AND je.entry_date <= $3
          GROUP BY jel.account_id
      ),
      processed_accounts AS (
          SELECT 
              coa.code AS "accountCode",
              coa.name AS "accountName",
              coa.account_type::TEXT AS "accountType",
              coa.is_summary AS "isSummary",
              CASE WHEN coa.parent_id IS NULL THEN 0 ELSE 1 END AS "level",
              
              -- Compute Opening Split
              CASE WHEN COALESCE(pa.net_opening, 0) > 0 THEN COALESCE(pa.net_opening, 0) ELSE 0 END AS "openingDebit",
              CASE WHEN COALESCE(pa.net_opening, 0) < 0 THEN ABS(COALESCE(pa.net_opening, 0)) ELSE 0 END AS "openingCredit",
              
              -- Compute Period Window Flow
              COALESCE(pa.period_debit, 0) AS "periodDebit",
              COALESCE(pa.period_credit, 0) AS "periodCredit",
              
              -- Compute Resulting Closing Split
              CASE WHEN (COALESCE(pa.net_opening, 0) + COALESCE(pa.period_debit, 0) - COALESCE(pa.period_credit, 0)) > 0 
                   THEN (COALESCE(pa.net_opening, 0) + COALESCE(pa.period_debit, 0) - COALESCE(pa.period_credit, 0)) 
                   ELSE 0 END AS "closingDebit",
              CASE WHEN (COALESCE(pa.net_opening, 0) + COALESCE(pa.period_debit, 0) - COALESCE(pa.period_credit, 0)) < 0 
                   THEN ABS(COALESCE(pa.net_opening, 0) + COALESCE(pa.period_debit, 0) - COALESCE(pa.period_credit, 0)) 
                   ELSE 0 END AS "closingCredit"
          FROM chart_of_accounts coa
          LEFT JOIN period_activity pa ON coa.id = pa.account_id
          WHERE coa.company_id = $1 
            AND coa.is_active = TRUE
            -- Legacy Range Filter Matching Logic
            AND ($4 = '' OR coa.code >= $4)
            AND ($5 = '' OR coa.code <= $5)
      )
      SELECT * FROM processed_accounts
      WHERE ($6 = 'detailed' OR "level" <= 1)
      ORDER BY "accountCode" ASC;
    `;

    const dbResult = await pool.query(query, [
      companyId,
      fromDate,
      toDate,
      fromAccount || "",
      toAccount || "",
      viewType || "summary",
    ]);
    
    const records = dbResult.rows;

    // 3. Aggregate Top-Level Structural Totals for jsreport Data Manifest
    const totals = records.reduce(
      (acc, r) => {
        if (r.level === 0) {
          acc.openingDebit += parseFloat(r.openingDebit);
          acc.openingCredit += parseFloat(r.openingCredit);
          acc.periodDebit += parseFloat(r.periodDebit);
          acc.periodCredit += parseFloat(r.periodCredit);
          acc.closingDebit += parseFloat(r.closingDebit);
          acc.closingCredit += parseFloat(r.closingCredit);
        }
        return acc;
      },
      { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0, closingDebit: 0, closingCredit: 0 }
    );

    // 4. Construct jsreport Payload Structure
    const jsreportPayload = {
      template: {
        name: format === "xlsx" ? "trial-balance-excel-template" : "trial-balance-print-template",
        recipe: format === "xlsx" ? "html-to-xlsx" : "chrome-pdf",
      },
      data: {
        companyName: "Your ERP Client Corp",
        parameters: { fromDate, toDate, fromAccount, toAccount, viewType },
        generatedAt: new Date().toISOString(),
        items: records,
        totals: totals,
      },
    };

    // 5. Connect to your jsreportonline Workspace
    const jsreportAuth = Buffer.from(
      `${process.env.JSREPORT_USERNAME}:${process.env.JSREPORT_PASSWORD}`
    ).toString("base64");

    const jsreportResponse = await fetch(`${process.env.JSREPORT_URL}/api/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${jsreportAuth}`,
      },
      body: JSON.stringify(jsreportPayload),
    });

    if (!jsreportResponse.ok) {
      const errText = await jsreportResponse.text();
      throw new Error(`jsreport engine failure response: ${errText}`);
    }

    // 6. Serve Document Stream back down to client browser
    const reportBuffer = await jsreportResponse.arrayBuffer();
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    return new NextResponse(Buffer.from(reportBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="trial_balance_${fromDate}_to_${toDate}.${format}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { asOfDate, includeUnposted, format } = body;
    // 'format' parameter dictates export logic: 'html' (for printing) or 'xlsx' (Excel)

    // 1. Fetch live data from the database
    const query = `
      WITH ledger_balances AS (
          SELECT jl.chart_of_accounts_id, COALESCE(SUM(jl.debit), 0.00) AS total_debit, COALESCE(SUM(jl.credit), 0.00) AS total_credit
          FROM journal_lines jl
          JOIN journal_entries je ON jl.journal_entry_id = je.id
          WHERE je.company_id = $1 AND je.entry_date <= $2 AND ($3 = TRUE OR je.status = 'posted')
          GROUP BY jl.chart_of_accounts_id
      )
      SELECT coa.code AS "accountCode", coa.name AS "accountName", coa.account_type::TEXT AS "accountType",
             coa.is_summary AS "isSummary", CASE WHEN coa.parent_id IS NULL THEN 0 ELSE 1 END AS "level",
             COALESCE(lb.total_debit, 0.00) AS "debit", COALESCE(lb.total_credit, 0.00) AS "credit"
      FROM chart_of_accounts coa
      LEFT JOIN ledger_balances lb ON coa.id = lb.chart_of_accounts_id
      WHERE coa.company_id = $1 AND coa.is_active = TRUE
      ORDER BY coa.code ASC;
    `;

    const dbResult = await pool.query(query, [
      companyId,
      asOfDate,
      includeUnposted,
    ]);
    const records = dbResult.rows;

    // 2. Prepare the payload structure expected by your jsreport template
    const jsreportPayload = {
      template: {
        // Map recipe based on whether user requested visual print preview or Excel sheet binaries
        name:
          format === "xlsx"
            ? "trial-balance-excel-template"
            : "trial-balance-print-template",
        recipe: format === "xlsx" ? "html-to-xlsx" : "chrome-pdf",
      },
      data: {
        companyName: "Your ERP Client Corp",
        asOfDate: asOfDate,
        generatedAt: new Date().toISOString(),
        items: records,
        totals: {
          debit: records.reduce(
            (sum, r) =>
              sum + (r.level === 0 && r.isSummary ? parseFloat(r.debit) : 0),
            0,
          ),
          credit: records.reduce(
            (sum, r) =>
              sum + (r.level === 0 && r.isSummary ? parseFloat(r.credit) : 0),
            0,
          ),
        },
      },
    };

    // 3. Dispatch the payload to jsreportonline
    const jsreportAuth = Buffer.from(
      `${process.env.JSREPORT_USERNAME}:${process.env.JSREPORT_PASSWORD}`,
    ).toString("base64");

    const jsreportResponse = await fetch(
      `${process.env.JSREPORT_URL}/api/report`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${jsreportAuth}`,
        },
        body: JSON.stringify(jsreportPayload),
      },
    );

    if (!jsreportResponse.ok) {
      const errText = await jsreportResponse.text();
      throw new Error(`jsreport error response: ${errText}`);
    }

    // 4. Pass the binary stream back down to the browser with proper MIME headers
    const reportBuffer = await jsreportResponse.arrayBuffer();
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    return new NextResponse(Buffer.from(reportBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="trial_balance_${asOfDate}.${format}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
} */
