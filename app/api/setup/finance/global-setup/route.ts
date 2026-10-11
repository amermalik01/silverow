// app/api/setup/finance/global-setup/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await pool.query(
      `SELECT * FROM company_finance_setup WHERE company_id = $1`,
      [companyId],
    );
    return NextResponse.json(result.rows[0] || {});
  } catch (error) {
    console.error("Global Finance Setup GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch setup" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const b = await req.json();

    const query = `
      INSERT INTO company_finance_setup 
      (company_id, vat_payable_receivable_account_id, vat_deferred_account_id, opening_balance_stock_account_id, opening_balance_equity_account_id, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (company_id) 
      DO UPDATE SET 
        vat_payable_receivable_account_id = EXCLUDED.vat_payable_receivable_account_id,
        vat_deferred_account_id = EXCLUDED.vat_deferred_account_id,
        opening_balance_stock_account_id = EXCLUDED.opening_balance_stock_account_id,
        opening_balance_equity_account_id = EXCLUDED.opening_balance_equity_account_id,
        updated_at = NOW();
    `;

    await pool.query(query, [
      companyId,
      b.vat_payable_receivable_account_id || null,
      b.vat_deferred_account_id || null,
      b.opening_balance_stock_account_id || null,
      b.opening_balance_equity_account_id || null,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Global Finance Setup PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to update setup" },
      { status: 500 },
    );
  }
}
