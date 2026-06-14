// app/api/reports/balance-sheet/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

interface DbQueryResultRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  isSummary: boolean;
  parentId: string | null;
  netBalance: string | number;
  priorNetBalance: string | number;
}

interface ProcessedRow extends DbQueryResultRow {
  processedAmount: number;
  processedPriorAmount: number;
}

interface BSReportPayloadRow {
  accountCode: string | null;
  accountName: string;
  rowType: "data" | "section_total" | "grand_total" | "calculated_group";
  section: "asset" | "liability" | "equity" | "total_liabilities_equity";
  level: number;
  amount: number;
  priorAmount: number;
}

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { asOfDate, comparePrior, format } = body;

    if (!asOfDate) {
      return NextResponse.json(
        { error: "Missing cutoff date 'asOfDate'." },
        { status: 400 },
      );
    }

    // Compute the exact comparison string boundaries safely
    const targetDate = new Date(asOfDate);
    targetDate.setFullYear(targetDate.getFullYear() - 1);
    const priorAsOfDate = targetDate.toISOString().split("T")[0];

    // 1. Dual-Period Cumulative Balance Aggregation CTE Query
    const dbQuery = `
      WITH current_balances AS (
          SELECT jel.account_id, SUM(jel.debit - jel.credit) AS balance
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.journal_id = je.id
          WHERE je.company_id = $1 AND je.is_posted = TRUE AND je.entry_date <= $2
          GROUP BY jel.account_id
      ),
      prior_balances AS (
          SELECT jel.account_id, SUM(jel.debit - jel.credit) AS balance
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.journal_id = je.id
          WHERE je.company_id = $1 AND je.is_posted = TRUE AND je.entry_date <= $3
          GROUP BY jel.account_id
      )
      SELECT 
          coa.code AS "accountCode", coa.name AS "accountName", coa.account_type::TEXT AS "accountType",
          coa.is_summary AS "isSummary", coa.parent_id AS "parentId",
          COALESCE(cb.balance, 0) AS "netBalance", COALESCE(pb.balance, 0) AS "priorNetBalance"
      FROM chart_of_accounts coa
      LEFT JOIN current_balances cb ON coa.id = cb.account_id
      LEFT JOIN prior_balances pb ON coa.id = pb.account_id
      WHERE coa.company_id = $1 AND coa.is_active = TRUE
      ORDER BY coa.code ASC;
    `;

    const dbResult = await pool.query(dbQuery, [
      companyId,
      asOfDate,
      priorAsOfDate,
    ]);

    // Containers matching hierarchy maps
    const assetRows: ProcessedRow[] = [];
    const liabilityRows: ProcessedRow[] = [];
    const equityRows: ProcessedRow[] = [];

    let totalAssets = 0;
    let totalPriorAssets = 0;
    let totalLiabilities = 0;
    let totalPriorLiabilities = 0;
    let totalEquity = 0;
    let totalPriorEquity = 0;

    // 2. Classify data records and handle inverse debit/credit layout projections
    (dbResult.rows as DbQueryResultRow[]).forEach((row) => {
      const type = row.accountType.toLowerCase();
      const currentBal =
        typeof row.netBalance === "string"
          ? parseFloat(row.netBalance)
          : row.netBalance;
      const priorBal =
        typeof row.priorNetBalance === "string"
          ? parseFloat(row.priorNetBalance)
          : row.priorNetBalance;

      if (
        type === "asset" ||
        type === "current_asset" ||
        type === "fixed_asset"
      ) {
        totalAssets += currentBal;
        totalPriorAssets += priorBal;
        assetRows.push({
          ...row,
          processedAmount: currentBal,
          processedPriorAmount: priorBal,
        });
      } else if (
        type === "liability" ||
        type === "current_liability" ||
        type === "long_term_liability"
      ) {
        totalLiabilities += currentBal * -1;
        totalPriorLiabilities += priorBal * -1;
        assetRows.push({
          ...row,
          processedAmount: currentBal * -1,
          processedPriorAmount: priorBal * -1,
        });
      } else if (
        type === "equity" ||
        type === "capital" ||
        type === "retained_earnings"
      ) {
        totalEquity += currentBal * -1;
        totalPriorEquity += priorBal * -1;
        assetRows.push({
          ...row,
          processedAmount: currentBal * -1,
          processedPriorAmount: priorBal * -1,
        });
      }
    });

    const bSStatement: BSReportPayloadRow[] = [];

    // --- GENERATE STRUCTURED ASSETS MATRIX ---
    bSStatement.push({
      accountCode: null,
      accountName: "Assets",
      rowType: "section_total",
      section: "asset",
      level: 0,
      amount: 0,
      priorAmount: 0,
    });

    // We can group child nodes under specific subheadings (e.g. Non-Current Assets vs Tangible Assets sub-totals)
    // To cleanly duplicate the legacy structure, we group based on parent_id markers or standard financial code ranges
    let intangibleSubDebit = 0;
    let intangibleSubPriorDebit = 0;
    let tangibleSubDebit = 0;
    let tangibleSubPriorDebit = 0;

    assetRows.forEach((r) => {
      const codeNum = parseInt(r.accountCode, 10);

      // Mimicking code breakdown ranges observed in your screenshots
      if (codeNum >= 1000 && codeNum <= 1089) {
        intangibleSubDebit += r.processedAmount;
        intangibleSubPriorDebit += r.processedPriorAmount;
      } else if (codeNum >= 1090 && codeNum <= 1199) {
        tangibleSubDebit += r.processedAmount;
        tangibleSubPriorDebit += r.processedPriorAmount;
      }

      bSStatement.push({
        accountCode: r.accountCode,
        accountName: r.accountName,
        rowType: r.isSummary ? "section_total" : "data",
        section: "asset",
        level: r.parentId ? 2 : 1,
        amount: r.processedAmount,
        priorAmount: r.processedPriorAmount,
      });

      // Inject custom subheadings calculation nodes at the exact block bounds
      if (r.accountCode === "1089") {
        bSStatement.push({
          accountCode: "1089",
          accountName: "Intangible Assets - Total",
          rowType: "section_total",
          section: "asset",
          level: 1,
          amount: intangibleSubDebit,
          priorAmount: intangibleSubPriorDebit,
        });
      }
      if (r.accountCode === "1199") {
        bSStatement.push({
          accountCode: "1199",
          accountName: "Office Equipment - Total",
          rowType: "section_total",
          section: "asset",
          level: 1,
          amount: tangibleSubDebit,
          priorAmount: tangibleSubPriorDebit,
        });
      }
    });

    bSStatement.push({
      accountCode: null,
      accountName: "Total Assets",
      rowType: "calculated_group",
      section: "asset",
      level: 0,
      amount: totalAssets,
      priorAmount: totalPriorAssets,
    });

    // 3. Serve standard JSON data packet
    if (format === "json") {
      return NextResponse.json(bSStatement);
    }

    // 4. Connect to jsreport workspace payload handshakes
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
        body: JSON.stringify({
          template: {
            name:
              format === "xlsx"
                ? "balance-sheet-excel-template"
                : "balance-sheet-print-template",
            recipe: format === "xlsx" ? "html-to-xlsx" : "chrome-pdf",
          },
          data: {
            companyName: "Your ERP Client Corp",
            generatedAt: new Date().toISOString(),
            asOfDate,
            priorAsOfDate,
            comparePrior,
            items: bSStatement,
          },
        }),
      },
    );

    if (!jsreportResponse.ok) {
      const errText = await jsreportResponse.text();
      throw new Error(`jsreport engine failure: ${errText}`);
    }

    const reportBuffer = await jsreportResponse.arrayBuffer();
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    return new NextResponse(Buffer.from(reportBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="balance_sheet_${asOfDate}.${format}"`,
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

interface DbQueryResultRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  netBalance: string | number;
}

interface ProcessedRow extends DbQueryResultRow {
  processedAmount: number;
}

interface BSReportPayloadRow {
  accountCode: string | null;
  accountName: string;
  rowType: "data" | "section_total" | "grand_total" | "calculated_group";
  section: "asset" | "liability" | "equity" | "total_liabilities_equity";
  level: number;
  amount: number;
}

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { asOfDate, format } = body;

    if (!asOfDate) {
      return NextResponse.json(
        { error: "Missing cutoff date 'asOfDate'." },
        { status: 400 },
      );
    }

    // 1. Fetch cumulative balances from inception up to target date cutoff
    const dbQuery = `
      WITH cumulative_balances AS (
          SELECT 
              jel.account_id,
              SUM(jel.debit - jel.credit) AS net_balance
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.journal_id = je.id
          WHERE je.company_id = $1
            AND je.is_posted = TRUE
            AND je.entry_date <= $2
          GROUP BY jel.account_id
      )
      SELECT 
          coa.code AS "accountCode",
          coa.name AS "accountName",
          coa.account_type::TEXT AS "accountType",
          COALESCE(cb.net_balance, 0) AS "netBalance"
      FROM chart_of_accounts coa
      LEFT JOIN cumulative_balances cb ON coa.id = cb.account_id
      WHERE coa.company_id = $1 
        AND coa.is_active = TRUE
      ORDER BY coa.code ASC;
    `;

    const dbResult = await pool.query(dbQuery, [companyId, asOfDate]);

    const assetRows: ProcessedRow[] = [];
    const liabilityRows: ProcessedRow[] = [];
    const equityRows: ProcessedRow[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    // 2. Classify and transform natural sub-ledger balances
    (dbResult.rows as DbQueryResultRow[]).forEach((row) => {
      const type = row.accountType.toLowerCase();
      const balance =
        typeof row.netBalance === "string"
          ? parseFloat(row.netBalance)
          : row.netBalance;

      if (
        type === "asset" ||
        type === "current_asset" ||
        type === "fixed_asset"
      ) {
        totalAssets += balance; // Debits are naturally positive for assets
        assetRows.push({ ...row, processedAmount: balance });
      } else if (
        type === "liability" ||
        type === "current_liability" ||
        type === "long_term_liability"
      ) {
        const value = balance * -1; // Convert natural credit balance to a positive integer display
        totalLiabilities += value;
        liabilityRows.push({ ...row, processedAmount: value });
      } else if (
        type === "equity" ||
        type === "capital" ||
        type === "retained_earnings"
      ) {
        const value = balance * -1; // Convert natural credit balance to a positive integer display
        totalEquity += value;
        equityRows.push({ ...row, processedAmount: value });
      }
    });

    const bSStatement: BSReportPayloadRow[] = [];

    // --- ASSETS SECTION ---
    bSStatement.push({
      accountCode: null,
      accountName: "Assets",
      rowType: "section_total",
      section: "asset",
      level: 0,
      amount: 0,
    });
    assetRows.forEach((r) => {
      bSStatement.push({
        accountCode: r.accountCode,
        accountName: r.accountName,
        rowType: "data",
        section: "asset",
        level: 1,
        amount: r.processedAmount,
      });
    });
    bSStatement.push({
      accountCode: null,
      accountName: "Total Assets",
      rowType: "calculated_group",
      section: "asset",
      level: 0,
      amount: totalAssets,
    });

    // --- LIABILITIES SECTION ---
    bSStatement.push({
      accountCode: null,
      accountName: "Liabilities",
      rowType: "section_total",
      section: "liability",
      level: 0,
      amount: 0,
    });
    liabilityRows.forEach((r) => {
      bSStatement.push({
        accountCode: r.accountCode,
        accountName: r.accountName,
        rowType: "data",
        section: "liability",
        level: 1,
        amount: r.processedAmount,
      });
    });
    bSStatement.push({
      accountCode: null,
      accountName: "Total Liabilities",
      rowType: "section_total",
      section: "liability",
      level: 0,
      amount: totalLiabilities,
    });

    // --- EQUITY SECTION ---
    bSStatement.push({
      accountCode: null,
      accountName: "Equity / Capitalization",
      rowType: "section_total",
      section: "equity",
      level: 0,
      amount: 0,
    });
    equityRows.forEach((r) => {
      bSStatement.push({
        accountCode: r.accountCode,
        accountName: r.accountName,
        rowType: "data",
        section: "equity",
        level: 1,
        amount: r.processedAmount,
      });
    });
    bSStatement.push({
      accountCode: null,
      accountName: "Total Equity",
      rowType: "section_total",
      section: "equity",
      level: 0,
      amount: totalEquity,
    });

    // --- LIABILITIES AND EQUITY COMBINED BALANCING FOOTER NODE ---
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    bSStatement.push({
      accountCode: null,
      accountName: "Total Liabilities and Equity",
      rowType: "grand_total",
      section: "total_liabilities_equity",
      level: 0,
      amount: totalLiabilitiesAndEquity,
    });

    // 3. Serve JSON dataset back to screen matrix
    if (format === "json") {
      return NextResponse.json(bSStatement);
    }

    // 4. Otherwise connect and handle jsreport pipeline parameters
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
        body: JSON.stringify({
          template: {
            name:
              format === "xlsx"
                ? "balance-sheet-excel-template"
                : "balance-sheet-print-template",
            recipe: format === "xlsx" ? "html-to-xlsx" : "chrome-pdf",
          },
          data: {
            companyName: "Your ERP Client Corp",
            generatedAt: new Date().toISOString(),
            asOfDate,
            items: bSStatement,
            isBalanced:
              Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
          },
        }),
      },
    );

    if (!jsreportResponse.ok) {
      const errText = await jsreportResponse.text();
      throw new Error(`jsreport execution failure: ${errText}`);
    }

    const reportBuffer = await jsreportResponse.arrayBuffer();
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    return new NextResponse(Buffer.from(reportBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="balance_sheet_${asOfDate}.${format}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
} */
