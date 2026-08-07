// app/api/finance/accounts/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { accountFormSchema } from "@/lib/validations/account.schema";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const query = `
      SELECT 
        coa.id, 
        coa.code, 
        coa.name, 
        coa.gl_account_type, 
        coa.range_start_code, 
        coa.range_end_code, 
        coa.status, 
        coa.parent_id, 
        coa.vat_rate_id, 
        coa.gl_no_display_as,
        parent.name AS category_name,
        v.name AS vat_rate_name,
        COALESCE(SUM(gle.debit), 0.00) AS total_debit,
        COALESCE(SUM(gle.credit), 0.00) AS total_credit
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts parent ON coa.parent_id = parent.id
      LEFT JOIN vat_rates v ON coa.vat_rate_id = v.id
      LEFT JOIN gl_ledger_entries gle 
        ON coa.id = gle.account_id 
        AND gle.company_id = $1
      WHERE coa.company_id = $1
      GROUP BY 
        coa.id, 
        parent.name, 
        v.name
      ORDER BY coa.code ASC;
    `;
    const result = await pool.query(query, [companyId]);

    const formatted = result.rows.map((row) => ({
      ...row,
      display_debit: Number(row.total_debit),
      display_credit: Number(row.total_credit),
    }));

    // Aggregate range calculations for 'End Total' structural summary rows
    const accounts = formatted.map((account) => {
      if (
        account.gl_account_type === "End Total" &&
        account.range_start_code &&
        account.range_end_code
      ) {
        const rangeAccounts = formatted.filter(
          (a) =>
            a.gl_account_type === "Posting" &&
            a.code >= account.range_start_code! &&
            a.code <= account.range_end_code!,
        );
        return {
          ...account,
          display_debit: rangeAccounts.reduce(
            (sum, a) => sum + a.display_debit,
            0,
          ),
          display_credit: rangeAccounts.reduce(
            (sum, a) => sum + a.display_credit,
            0,
          ),
        };
      }
      return account;
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("GET COA Error:", error);
    return NextResponse.json(
      { error: "Failed tracking structural chart matrices" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = accountFormSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 },
      );

    const {
      code,
      name,
      gl_account_type,
      category_id,
      sub_category_id,
      heading_id,
      gl_no_display_as,
      vat_rate_id,
      status,
      range_start_code,
      range_end_code,
    } = parsed.data;

    // Fixed hierarchy parsing logic: nearest structural parent assignments
    const finalParentId = heading_id || sub_category_id || category_id || null;

    const res = await pool.query(
      `INSERT INTO chart_of_accounts (
        company_id, code, name, gl_account_type, parent_id, vat_rate_id, 
        gl_no_display_as, status, range_start_code, range_end_code, is_posting
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        companyId,
        code,
        name,
        gl_account_type,
        finalParentId,
        vat_rate_id || null,
        gl_no_display_as,
        status,
        range_start_code,
        range_end_code,
        gl_account_type === "Posting",
      ],
    );

    return NextResponse.json(res.rows[0]);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: dbError.message || "Engine transactional breakdown." },
      { status: 422 },
    );
  }
}
/* export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const query = `
      SELECT 
        coa.id, coa.code, coa.name, coa.gl_account_type, coa.range_start_code, coa.range_end_code, coa.status, coa.parent_id, coa.vat_rate_id, coa.gl_no_display_as,
        c.name as category_name,
        sc.name as sub_category_name,
        v.name as vat_rate_name,
        COALESCE((SELECT SUM(l.debit) FROM journal_entry_lines l 
                  JOIN journal_entries j ON j.id = l.journal_id 
                  WHERE l.account_id = coa.id AND j.is_posted = true), 0) as total_debit,
        COALESCE((SELECT SUM(l.credit) FROM journal_entry_lines l 
                  JOIN journal_entries j ON j.id = l.journal_id 
                  WHERE l.account_id = coa.id AND j.is_posted = true), 0) as total_credit
      FROM chart_of_accounts coa
      LEFT JOIN chart_of_accounts c ON coa.parent_id = c.id
      LEFT JOIN chart_of_accounts sc ON coa.parent_id = sc.id
      LEFT JOIN vat_rates v ON coa.vat_rate_id = v.id
      WHERE coa.company_id = $1
      ORDER BY coa.code ASC;
    `;
    const result = await pool.query(query, [companyId]);

    const formatted = result.rows.map((row) => ({
      ...row,
      display_debit: Number(row.total_debit),
      display_credit: Number(row.total_credit),
    }));

    const accounts = formatted.map((account) => {
      if (
        account.gl_account_type === "End Total" &&
        account.range_start_code &&
        account.range_end_code
      ) {
        const rangeAccounts = formatted.filter(
          (a) =>
            a.gl_account_type === "Posting" &&
            a.code >= account.range_start_code! &&
            a.code <= account.range_end_code!,
        );
        return {
          ...account,
          display_debit: rangeAccounts.reduce(
            (sum, a) => sum + a.display_debit,
            0,
          ),
          display_credit: rangeAccounts.reduce(
            (sum, a) => sum + a.display_credit,
            0,
          ),
        };
      }
      return account;
    });

    return NextResponse.json(accounts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed tracking structural chart matrices" },
      { status: 500 },
    );
  }
} */
