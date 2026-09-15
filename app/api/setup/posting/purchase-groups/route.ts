// app/api/setup/posting/purchase-groups/route.ts

import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const companyId = await getCompanyId();
    if (!companyId) return NextResponse.json([], { status: 401 });

    // Swapped account_code with code
    const result = await pool.query(
      `SELECT g.id, g.name, g.posting_group_id,g.payable_account_id, g.purchase_account_id, g.discount_account_id, g.vat_account_id, g.inventory_account_id, g.grni_account_id,
              CONCAT(a1.code, ' - ', a1.name) as payable_account,
              CONCAT(a2.code, ' - ', a2.name) as purchase_account,
              CONCAT(a3.code, ' - ', a3.name) as discount_account,
              CONCAT(a4.code, ' - ', a4.name) as vat_account,
              CONCAT(a5.code, ' - ', a5.name) as inventory_account,
              CONCAT(a6.code, ' - ', a6.name) as grni_account,
              pb.name as posting_group
       FROM purchase_posting_groups g

       LEFT JOIN chart_of_accounts a1 ON g.payable_account_id = a1.id
       LEFT JOIN chart_of_accounts a2 ON g.purchase_account_id = a2.id
       LEFT JOIN chart_of_accounts a3 ON g.discount_account_id = a3.id
       LEFT JOIN chart_of_accounts a4 ON g.vat_account_id = a4.id
       LEFT JOIN chart_of_accounts a5 ON g.inventory_account_id = a5.id
       LEFT JOIN chart_of_accounts a6 ON g.grni_account_id = a6.id
       LEFT JOIN vat_business_posting_groups pb ON g.posting_group_id = pb.id

       WHERE g.company_id = $1 ORDER BY g.name`,
      [companyId],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Purchase Groups GET Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) return NextResponse.json([], { status: 401 });

    const b = await req.json();

    const result = await pool.query(
      `INSERT INTO purchase_posting_groups 
       (company_id, posting_group_id, payable_account_id, purchase_account_id, discount_account_id, vat_account_id, inventory_account_id, grni_account_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        companyId,
        b.posting_group_id,
        b.payable_account_id,
        b.purchase_account_id,

        b.discount_account_id || null,
        b.vat_account_id || null,
        b.inventory_account_id || null,
        b.grni_account_id || null,
      ],
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Purchase Groups POST Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
