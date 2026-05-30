// /app/api/sales/sales-returns/setup-dependencies/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Company Active Parties (Customers)
    const customersRes = await pool.query(
      `SELECT id, name FROM parties WHERE company_id = $1 AND type = 'customer'  AND status = 'active' ORDER BY name ASC`,
      [companyId],
    );
    // , AND is_customer = true 

    // 2. Fetch Tenant Configured Active Currencies with Assigned Exchange Weights
    const currenciesRes = await pool.query(
      `SELECT c.id, c.code, c.name, cc.exchange_rate, cc.is_base 
       FROM company_currencies cc
       INNER JOIN currencies c ON c.id = cc.currency_id
       WHERE cc.company_id = $1 AND cc.status = 1`,
      [companyId],
    );

    // 3. Fetch Invoices for Model selection reference arrays
    const invoicesRes = await pool.query(
      `SELECT si.id, si.invoice_no, si.invoice_date, si.total_amount, p.name as customer_name, si.customer_id
       FROM sales_invoices si
       LEFT JOIN parties p ON p.id = si.customer_id
       WHERE si.company_id = $1
       ORDER BY si.invoice_date DESC`,
      [companyId],
    );

    return NextResponse.json({
      success: true,
      customers: customersRes.rows,
      currencies: currenciesRes.rows,
      invoices: invoicesRes.rows,
    });
  } catch (error) {
    console.error("Setup options build exception:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
