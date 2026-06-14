// app/api/reports/figure-by-gl/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

interface DbJournalRecord {
  accountId: string;
  accountCode: string;
  accountName: string;
  postingDate: string;
  documentType: string;
  documentNo: string;
  sourceNo: string;
  lineName: string;
  employeeName: string | null;
  lineAmount: string | number;
  entryNo: string | number;
}

interface TransactionLine {
  postingDate: string;
  documentType: string;
  documentNo: string;
  sourceNo: string;
  name: string;
  employee: string | null;
  amount: number;
  entryNo: number;
}

interface GLGroupBlock {
  accountId: string;
  accountCode: string;
  accountName: string;
  lines: TransactionLine[];
  totalAmount: number;
}

// Replaced the { [key: string]: any } rule with a strict record type map
interface GroupMapContainer {
  [accountId: string]: GLGroupBlock;
}

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fromDate, toDate, reportType, accountIds, format } = body;

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: "Missing array context parameter 'accountIds'." },
        { status: 400 },
      );
    }

    // 1. Fetch historical rows mapped within specified bounds
    const dbQuery = `
      SELECT 
          coa.id AS "accountId",
          coa.code AS "accountCode",
          coa.name AS "accountName",
          TO_CHAR(je.entry_date, 'DD/MM/YYYY') AS "postingDate",
          je.document_type AS "documentType",
          je.document_no AS "documentNo",
          COALESCE(je.source_code, '') AS "sourceNo",
          COALESCE(jel.description, coa.name) AS "lineName",
          jel.employee_name AS "employeeName",
          (jel.debit - jel.credit) AS "lineAmount",
          jel.id AS "entryNo"
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_id = je.id
      WHERE coa.company_id = $1
        AND coa.id = ANY($2)
        AND je.is_posted = TRUE
        AND je.entry_date >= $3
        AND je.entry_date <= $4
      ORDER BY coa.code ASC, je.entry_date ASC, jel.id ASC;
    `;

    const dbResult = await pool.query(dbQuery, [
      companyId,
      accountIds,
      fromDate,
      toDate,
    ]);
    const databaseRows = dbResult.rows as DbJournalRecord[];

    // 2. Map and structure rows using the strict typed container interface
    const groupMap: GroupMapContainer = {};

    // Initialize map with accounts to output summary headings even if they have no lines
    const explicitAccountsQuery = `SELECT id, code, name FROM chart_of_accounts WHERE id = ANY($1) ORDER BY code ASC;`;
    const accountsInfo = await pool.query(explicitAccountsQuery, [accountIds]);

    accountsInfo.rows.forEach((acc) => {
      groupMap[acc.id] = {
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        lines: [],
        totalAmount: 0,
      };
    });

    // Populate transaction data lines cleanly without any type casting bypass anomalies
    databaseRows.forEach((row) => {
      if (row.entryNo && groupMap[row.accountId]) {
        const amt =
          typeof row.lineAmount === "string"
            ? parseFloat(row.lineAmount)
            : row.lineAmount;

        groupMap[row.accountId].lines.push({
          postingDate: row.postingDate,
          documentType: row.documentType,
          documentNo: row.documentNo,
          sourceNo: row.sourceNo,
          name: row.lineName,
          employee: row.employeeName,
          amount: amt,
          entryNo:
            typeof row.entryNo === "string"
              ? parseInt(row.entryNo, 10)
              : row.entryNo,
        });

        groupMap[row.accountId].totalAmount += amt;
      }
    });

    const reportPayload = Object.values(groupMap);

    if (format === "json") {
      return NextResponse.json(reportPayload);
    }

    // 3. Connect downstream dataset blocks directly to jsreport pipeline templates
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
              format === "xlsx" ? "figure-by-gl-excel" : "figure-by-gl-print",
            recipe: format === "xlsx" ? "html-to-xlsx" : "chrome-pdf",
          },
          data: {
            companyName: "Your ERP Client Corp",
            generatedAt: new Date().toISOString(),
            fromDate,
            toDate,
            reportType,
            groups: reportPayload,
          },
        }),
      },
    );

    if (!jsreportResponse.ok)
      throw new Error(
        "jsreport formatting error during Figure By G/L pipeline execution.",
      );

    const reportBuffer = await jsreportResponse.arrayBuffer();
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    return new NextResponse(Buffer.from(reportBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="figure_by_gl_${toDate}.${format}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
