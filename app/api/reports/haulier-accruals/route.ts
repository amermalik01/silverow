// app/api/reports/haulier-accruals/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

interface DbAccrualRecord {
  id: string;
  haulierNo: string;
  haulierName: string;
  documentNo: string;
  postingDate: string;
  accrualAmount: string | number;
  clearedAmount: string | number;
  remainingAccrued: string | number;
  glAccountCode: string;
}

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fromDate, toDate, accountIds, format } = body;

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json({ error: "Missing required parameter context 'accountIds'." }, { status: 400 });
    }

    // DB query aggregating line items from haulier accruals tables
    const accrualsQuery = `
      SELECT 
        ha.id AS "id",
        h.code AS "haulierNo",
        h.name AS "haulierName",
        ha.document_no AS "documentNo",
        TO_CHAR(ha.posting_date, 'DD/MM/YYYY') AS "postingDate",
        ha.accrual_amount AS "accrualAmount",
        ha.cleared_amount AS "clearedAmount",
        (ha.accrual_amount - ha.cleared_amount) AS "remainingAccrued",
        coa.code AS "glAccountCode"
      FROM haulier_accruals ha
      JOIN hauliers h ON ha.haulier_id = h.id
      JOIN chart_of_accounts coa ON ha.account_id = coa.id
      WHERE ha.company_id = $1
        AND ha.account_id = ANY($2)
        AND ha.posting_date >= $3
        AND ha.posting_date <= $4
      ORDER BY ha.posting_date ASC, h.code ASC;
    `;

    const dbResult = await pool.query(accrualsQuery, [companyId, accountIds, fromDate, toDate]);
    const rawRows = dbResult.rows as DbAccrualRecord[];

    // Parse data safely for strict type evaluations
    const serializedPayload = rawRows.map(row => ({
      id: row.id,
      haulierNo: row.haulierNo,
      haulierName: row.haulierName,
      documentNo: row.documentNo,
      postingDate: row.postingDate,
      accrualAmount: typeof row.accrualAmount === 'string' ? parseFloat(row.accrualAmount) : Number(row.accrualAmount),
      clearedAmount: typeof row.clearedAmount === 'string' ? parseFloat(row.clearedAmount) : Number(row.clearedAmount),
      remainingAccrued: typeof row.remainingAccrued === 'string' ? parseFloat(row.remainingAccrued) : Number(row.remainingAccrued),
      glAccountCode: row.glAccountCode
    }));

    if (format === 'json') {
      return NextResponse.json(serializedPayload);
    }

    // Connect downstream dataset blocks directly to jsreport printing nodes
    const jsreportAuth = Buffer.from(
      `${process.env.JSREPORT_USERNAME}:${process.env.JSREPORT_PASSWORD}`
    ).toString("base64");

    const jsreportResponse = await fetch(`${process.env.JSREPORT_URL}/api/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${jsreportAuth}`,
      },
      body: JSON.stringify({
        template: {
          name: format === "xlsx" ? "haulier-accruals-excel" : "haulier-accruals-print",
          recipe: format === "xlsx" ? "html-to-xlsx" : "chrome-pdf",
        },
        data: {
          companyName: "Your ERP Client Corp",
          generatedAt: new Date().toISOString(),
          fromDate,
          toDate,
          lines: serializedPayload
        },
      }),
    });

    if (!jsreportResponse.ok) throw new Error("jsreport processing engine pipeline execution crash.");

    const reportBuffer = await jsreportResponse.arrayBuffer();
    const contentType = format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";

    return new NextResponse(Buffer.from(reportBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="haulier_accruals_${toDate}.${format}"`,
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backend failure execution rule.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}