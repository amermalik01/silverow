// app/api/reports/profit-loss/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

interface DbQueryResultRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: string | number;
  credit: string | number;
  netBalance: string | number;
}

interface ProcessedRow extends DbQueryResultRow {
  processedAmount: number;
}

interface PLReportPayloadRow {
  accountCode: string | null;
  accountName: string;
  rowType: "data" | "section_total" | "grand_total" | "calculated_group";
  section:
    | "turnover"
    | "cost_of_sales"
    | "expenses"
    | "gross_profit"
    | "net_profit";
  level: number;
  amount: number;
  percentageOfTurnover: number;
}

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fromDate, toDate, fromAccount, toAccount, format } = body;

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Missing timeline arguments." },
        { status: 400 },
      );
    }

    // 1. Fetch performance sums grouped cleanly by Account Type category definitions
    const dbQuery = `
      WITH period_activity AS (
          SELECT 
              jel.account_id,
              SUM(jel.debit) AS total_debit,
              SUM(jel.credit) AS total_credit,
              SUM(jel.debit - jel.credit) AS net_balance
          FROM journal_entry_lines jel
          JOIN journal_entries je ON jel.journal_id = je.id
          WHERE je.company_id = $1
            AND je.is_posted = TRUE
            AND je.entry_date >= $2
            AND je.entry_date <= $3
          GROUP BY jel.account_id
      )
      SELECT 
          coa.code AS "accountCode",
          coa.name AS "accountName",
          coa.account_type::TEXT AS "accountType",
          COALESCE(pa.total_debit, 0) AS "debit",
          COALESCE(pa.total_credit, 0) AS "credit",
          COALESCE(pa.net_balance, 0) AS "netBalance"
      FROM chart_of_accounts coa
      LEFT JOIN period_activity pa ON coa.id = pa.account_id
      WHERE coa.company_id = $1 
        AND coa.is_active = TRUE
        AND ($4 = '' OR coa.code >= $4)
        AND ($5 = '' OR coa.code <= $5)
      ORDER BY coa.code ASC;
    `;

    const dbResult = await pool.query(dbQuery, [
      companyId,
      fromDate,
      toDate,
      fromAccount || "",
      toAccount || "",
    ]);

    const records = dbResult.rows;

    // 2. Separate variables for strict structural P&L calculations
    const turnoverRows: ProcessedRow[] = [];
    const costOfSalesRows: ProcessedRow[] = [];
    const expenseRows: ProcessedRow[] = [];

    const pAndLPayload: PLReportPayloadRow[] = [];

    let totalTurnover = 0;
    let totalCostOfSales = 0;
    let totalExpenses = 0;

    // 3. Process records according to their specific accounting properties
    // Revenue balances are naturally negative (Credit) in the DB, so invert them for presentation
    records.forEach((row) => {
      const type = row.accountType?.toLowerCase();
      const balance = parseFloat(row.netBalance);

      if (type === "revenue" || type === "turnover" || type === "income") {
        const value = balance * -1; // Convert credit balance to a positive integer display
        totalTurnover += value;
        turnoverRows.push({ ...row, processedAmount: value });
      } else if (type === "cost_of_sales" || type === "direct_costs") {
        const value = balance; // Debit balance naturally matches costs
        totalCostOfSales += value;
        costOfSalesRows.push({ ...row, processedAmount: value });
      } else if (
        type === "expense" ||
        type === "expenses" ||
        type === "operating_expenses"
      ) {
        const value = balance;
        totalExpenses += value;
        expenseRows.push({ ...row, processedAmount: value });
      }
    });

    const divisor = totalTurnover === 0 ? 1 : totalTurnover;

    // --- TURNOVER BLOCK ---
    pAndLPayload.push({
      accountCode: null,
      accountName: "Turnover",
      rowType: "section_total",
      section: "turnover",
      level: 0,
      amount: 0,
      percentageOfTurnover: 0,
    });
    turnoverRows.forEach((r) => {
      pAndLPayload.push({
        accountCode: r.accountCode,
        accountName: r.accountName,
        rowType: "data",
        section: "turnover",
        level: 1,
        amount: r.processedAmount,
        percentageOfTurnover: (r.processedAmount / divisor) * 100,
      });
    });
    pAndLPayload.push({
      accountCode: null,
      accountName: "Total Turnover",
      rowType: "section_total",
      section: "turnover",
      level: 0,
      amount: totalTurnover,
      percentageOfTurnover: (totalTurnover / divisor) * 100,
    });

    // --- COST OF SALES BLOCK ---
    pAndLPayload.push({
      accountCode: null,
      accountName: "Cost of Sales",
      rowType: "section_total",
      section: "cost_of_sales",
      level: 0,
      amount: 0,
      percentageOfTurnover: 0,
    });
    costOfSalesRows.forEach((r) => {
      pAndLPayload.push({
        accountCode: r.accountCode,
        accountName: r.accountName,
        rowType: "data",
        section: "cost_of_sales",
        level: 1,
        amount: r.processedAmount,
        percentageOfTurnover: (r.processedAmount / divisor) * 100,
      });
    });
    pAndLPayload.push({
      accountCode: null,
      accountName: "Total Cost of Sales",
      rowType: "section_total",
      section: "cost_of_sales",
      level: 0,
      amount: totalCostOfSales,
      percentageOfTurnover: (totalCostOfSales / divisor) * 100,
    });

    // --- INTERMEDIARY CALCULATED NODE: GROSS PROFIT ---
    const grossProfit = totalTurnover - totalCostOfSales;
    pAndLPayload.push({
      accountCode: null,
      accountName: "Gross Profit",
      rowType: "calculated_group",
      section: "gross_profit",
      level: 0,
      amount: grossProfit,
      percentageOfTurnover: (grossProfit / divisor) * 100,
    });

    // --- OPERATING EXPENSES BLOCK ---
    if (expenseRows.length > 0) {
      pAndLPayload.push({
        accountCode: null,
        accountName: "Expenses",
        rowType: "section_total",
        section: "expenses",
        level: 0,
        amount: 0,
        percentageOfTurnover: 0,
      });
      expenseRows.forEach((r) => {
        pAndLPayload.push({
          accountCode: r.accountCode,
          accountName: r.accountName,
          rowType: "data",
          section: "expenses",
          level: 1,
          amount: r.processedAmount,
          percentageOfTurnover: (r.processedAmount / divisor) * 100,
        });
      });
      pAndLPayload.push({
        accountCode: null,
        accountName: "Total Expenses",
        rowType: "section_total",
        section: "expenses",
        level: 0,
        amount: totalExpenses,
        percentageOfTurnover: (totalExpenses / divisor) * 100,
      });
    }

    // --- FINAL NODE: NET PROFIT / LOSS ---
    const netProfit = grossProfit - totalExpenses;
    pAndLPayload.push({
      accountCode: null,
      accountName: netProfit >= 0 ? "Net Profit" : "Net Loss",
      rowType: "grand_total",
      section: "net_profit",
      level: 0,
      amount: netProfit,
      percentageOfTurnover: (netProfit / divisor) * 100,
    });

    // 5. Short-circuit response if on-screen json is all that is requested
    if (format === "json") {
      return NextResponse.json(pAndLPayload);
    }

    // 6. Otherwise, pass the constructed data object directly to jsreport templates
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
                ? "profit-loss-excel-template"
                : "profit-loss-print-template",
            recipe: format === "xlsx" ? "html-to-xlsx" : "chrome-pdf",
          },
          data: {
            companyName: "Your ERP Client Corp",
            generatedAt: new Date().toISOString(),
            fromDate,
            toDate,
            items: pAndLPayload,
            summary: { grossProfit, netProfit, totalTurnover },
          },
        }),
      },
    );

    if (!jsreportResponse.ok) {
      const errText = await jsreportResponse.text();
      throw new Error(`jsreport error response: ${errText}`);
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
        "Content-Disposition": `attachment; filename="profit_loss_${fromDate}_to_${toDate}.${format}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
