// app/api/parties/finance-master-data/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(request: NextRequest) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json(
      { error: "Access Denied. Unauthorized Session Check." },
      { status: 401 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const moduleType = searchParams.get("moduleType") || "global";

  const client = await pool.connect();

  try {
    const [
      postingGroupsRes,
      payableBanksRes,
      paymentTermsRes,
      paymentMethodsRes,
    ] = await Promise.all([
      // 1. VAT Business Posting Groups
      client.query(
        `SELECT id, name 
           FROM vat_business_posting_groups 
           WHERE company_id = $1 
           ORDER BY name ASC`,
        [companyId],
      ),

      // 2. Payable Banks / Bank Accounts
      client.query(
        `SELECT id, bank_name 
           FROM bank_accounts 
           WHERE company_id = $1
           ORDER BY bank_name ASC`,
        [companyId],
      ),

      // 3. Payment Terms
      client.query(
        `SELECT id, name, days 
           FROM payment_terms 
           WHERE company_id = $1 
             AND is_active = TRUE
             AND (module_type = $2 OR module_type = 'global')
           ORDER BY name ASC`,
        [companyId, moduleType],
      ),

      // 4. Payment Methods
      client.query(
        `SELECT id, name 
           FROM payment_method 
           WHERE company_id = $1 
             AND is_active = TRUE 
             AND (module_type = $2 OR module_type = 'global')
           ORDER BY name ASC`,
        [companyId, moduleType],
      ),
    ]);

    return NextResponse.json({
      postingGroups: postingGroupsRes.rows,
      payableBanks: payableBanksRes.rows,
      paymentTerms: paymentTermsRes.rows,
      paymentMethods: paymentMethodsRes.rows,
    });
  } catch (error) {
    console.error("Finance Master Data fetch error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
