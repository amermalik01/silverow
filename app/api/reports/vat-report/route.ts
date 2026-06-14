// app/api/reports/vat-report/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

interface VatDataRow {
  //   rowNo: number;
  rowNo: number;
  description: string;
  amount: number;
}

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fromDate, toDate, vatStatus, includeOpenBefore, format } = body;

    // Build conditional timeline constraints reflecting checkbox parameters
    let dateFilterQuery = `AND je.entry_date >= $2 AND je.entry_date <= $3`;
    if (includeOpenBefore) {
      dateFilterQuery = `AND je.entry_date <= $3`;
    }

    // 1. Core query aggregating taxable net bases and explicit tax values
    const query = `
      SELECT 
          SUM(CASE WHEN tx.type = 'output' THEN jel.tax_amount ELSE 0 END) as sales_vat,
          SUM(CASE WHEN tx.type = 'input' THEN jel.tax_amount ELSE 0 END) as purchase_vat,
          SUM(CASE WHEN tx.type = 'output' THEN jel.net_amount ELSE 0 END) as sales_net,
          SUM(CASE WHEN tx.type = 'input' THEN jel.net_amount ELSE 0 END) as purchase_net
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_id = je.id
      JOIN tax_rates tx ON jel.tax_rate_id = tx.id
      WHERE je.company_id = $1
        AND je.is_posted = TRUE
        ${dateFilterQuery}
        ${vatStatus !== "All" ? "AND jel.vat_status = $4" : ""};
    `;

    const params = [companyId, fromDate, toDate];
    if (vatStatus !== "All") {
      params.push(vatStatus);
    }

    const dbResult = await pool.query(query, params);
    const summaryMetrics = dbResult.rows[0];

    const b1_salesVat = parseFloat(summaryMetrics?.sales_vat || 0);
    const b4_purchaseVat = parseFloat(summaryMetrics?.purchase_vat || 0);
    const b6_salesNet = parseFloat(summaryMetrics?.sales_net || 0);
    const b7_purchaseNet = parseFloat(summaryMetrics?.purchase_net || 0);

    // Compute total combined liabilities
    const b3_totalVatDue = b1_salesVat;
    const b5_netVatToPay = b3_totalVatDue - b4_purchaseVat;

    // 2. Map calculated metrics to the 9 standard box layout items
    const vatBoxes: VatDataRow[] = [
      {
        rowNo: 1,
        description: "VAT due on sales and other outputs",
        amount: b1_salesVat,
      },
      {
        rowNo: 2,
        description: "VAT due on acquisition from other EU Member States",
        amount: 0.0,
      },
      { rowNo: 3, description: "Total VAT due", amount: b3_totalVatDue },
      {
        rowNo: 4,
        description: "VAT reclaimed on purchases (incl. EU acquisitions)",
        amount: b4_purchaseVat,
      },
      {
        rowNo: 5,
        description: "Net VAT to be paid (+) or to be reclaimed (-)",
        amount: b5_netVatToPay,
      },
      {
        rowNo: 6,
        description: "Total value of sales excl. VAT, incl. Row 9",
        amount: b6_salesNet,
      },
      {
        rowNo: 7,
        description: "Total value of purchases excl. VAT, incl. Row 9",
        amount: b7_purchaseNet,
      },
      { rowNo: 8, description: "Total value of EU Sales", amount: 0.0 },
      { rowNo: 9, description: "Total value of EU Purchases", amount: 0.0 },
    ];

    if (format === "json") {
      return NextResponse.json(vatBoxes);
    }

    // 3. Connect structured layout values directly to jsreport actions
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
              format === "xlsx" ? "vat-excel-template" : "vat-print-template",
            recipe: format === "xlsx" ? "html-to-xlsx" : "chrome-pdf",
          },
          data: {
            companyName: "Your ERP Client Corp",
            generatedAt: new Date().toISOString(),
            fromDate,
            toDate,
            includeOpenBefore,
            vatStatus,
            items: vatBoxes,
          },
        }),
      },
    );

    if (!jsreportResponse.ok) throw new Error("jsreport formatting error.");

    const reportBuffer = await jsreportResponse.arrayBuffer();
    const contentType =
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    return new NextResponse(Buffer.from(reportBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="vat_report_${fromDate}_to_${toDate}.${format}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
