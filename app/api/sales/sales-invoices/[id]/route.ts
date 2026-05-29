// /app/api/sales/sales-invoices/[id]/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

import { getCompanyId } from "@/lib/auth/getCompanyId";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id: invoiceId } = await params;

    // 1. Fetch Invoice Header with Customer Name details
    const headerResult = await pool.query(
      `
      SELECT 
        si.*,
        p.name as customer_name
      FROM sales_invoices si
      LEFT JOIN parties p ON p.id = si.customer_id
      WHERE si.id = $1 AND si.company_id = $2
      `,
      [invoiceId, companyId],
    );

    if (!headerResult.rows.length) {
      return NextResponse.json(
        { error: "Sales invoice not found" },
        { status: 404 },
      );
    }

    const invoice = headerResult.rows[0];

    // 2. Fetch Invoice Lines accompanied by their source cross-reference tracking details
    const linesResult = await pool.query(
      `
      SELECT 
        sil.*,
        i.item_code,
        i.name as item_name,
        coa.code as account_code,
        coa.name as account_name,
        w.name as warehouse_name
      FROM sales_invoice_lines sil
      LEFT JOIN items i ON i.id = sil.item_id
      LEFT JOIN chart_of_accounts coa ON coa.id = sil.gl_account_id
      LEFT JOIN warehouses w ON w.id = sil.warehouse_id
      WHERE sil.sales_invoice_id = $1 AND sil.company_id = $2
      ORDER BY sil.line_no ASC
      `,
      [invoiceId, companyId],
    );

    return NextResponse.json({
      success: true,
      invoice,
      lines: linesResult.rows,
    });
  } catch (error) {
    console.error("Failed to retrieve invoice details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
