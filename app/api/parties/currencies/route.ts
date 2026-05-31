// app/api/parties/currencies/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currenciesRes = await pool.query(
      `SELECT c.id, c.code, c.name, cc.exchange_rate, cc.is_base 
       FROM company_currencies cc
       INNER JOIN currencies c ON c.id = cc.currency_id
       WHERE cc.company_id = $1 AND cc.status = 1`,
      [companyId],
    );

    return NextResponse.json(currenciesRes.rows);
  } catch (err) {
    console.error("Failed to pull company currencies:", err);
    return NextResponse.json({ error: "Internal Database Exception" }, { status: 500 });
  }
}