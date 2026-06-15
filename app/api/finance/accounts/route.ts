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
        coa.id, coa.code, coa.name, coa.gl_account_type, coa.range_start_code, coa.range_end_code, coa.status,
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

    // Core Engine Logic: Roll up Posting values into structural End Totals dynamically
    const formatted = result.rows.map((row) => ({
      ...row,
      display_debit: Number(row.total_debit),
      display_credit: Number(row.total_credit),
    }));

    // Process structural rollups for 'End Total' types
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

        const sumDebit = rangeAccounts.reduce(
          (sum, a) => sum + a.display_debit,
          0,
        );
        const sumCredit = rangeAccounts.reduce(
          (sum, a) => sum + a.display_credit,
          0,
        );

        return {
          ...account,
          display_debit: sumDebit,
          display_credit: sumCredit,
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

    // Determine target fallback structure node
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
        vat_rate_id,
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

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { accountFormSchema } from "@/lib/validations/account.schema";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Computes normal debit balances vs normal credit balances cleanly
    const query = `
      SELECT 
        id, code, name, account_type, parent_id, is_summary, is_posting,
        COALESCE((SELECT SUM(debit) FROM journal_entry_lines l 
                  JOIN journal_entries j ON j.id = l.journal_id 
                  WHERE l.account_id = coa.id AND j.is_posted = true), 0) as total_debit,
        COALESCE((SELECT SUM(credit) FROM journal_entry_lines l 
                  JOIN journal_entries j ON j.id = l.journal_id 
                  WHERE l.account_id = coa.id AND j.is_posted = true), 0) as total_credit
      FROM chart_of_accounts coa
      WHERE company_id = $1
      ORDER BY code ASC;
    `;
    const result = await pool.query(query, [companyId]);

    const accounts = result.rows.map((row) => {
      const debit = Number(row.total_debit);
      const credit = Number(row.total_credit);
      let balance = 0;

      // Adjust balance direction using standard double-entry rules
      if (["ASSET", "EXPENSE"].includes(row.account_type)) {
        balance = debit - credit;
      } else {
        balance = credit - debit;
      }

      return { ...row, balance, display_debit: debit, display_credit: credit };
    });

    return NextResponse.json(accounts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to pull account trees" },
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

    const { code, name, account_type, parent_id, vat_rate_id, is_summary } =
      parsed.data;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (parent_id) {
        const parent = await client.query(
          `SELECT is_summary FROM chart_of_accounts WHERE id = $1 AND company_id = $2`,
          [parent_id, companyId],
        );
        if (!parent.rows.length || !parent.rows[0].is_summary) {
          throw new Error(
            "Target parent node assignment must be a summary type",
          );
        }
      }

      const existing = await client.query(
        `SELECT 1 FROM chart_of_accounts WHERE company_id = $1 AND code = $2`,
        [companyId, code],
      );
      if (existing.rows.length > 0)
        throw new Error("Account code duplicate detected");

      const res = await client.query(
        `
        INSERT INTO chart_of_accounts (company_id, code, name, account_type, parent_id, vat_rate_id, is_summary, is_posting)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          companyId,
          code,
          name,
          account_type,
          parent_id,
          vat_rate_id,
          is_summary,
          !is_summary,
        ],
      );

      await client.query("COMMIT");
      return NextResponse.json(res.rows[0]);
    } catch (err) {     

      const dbError = err as { code?: string; message?: string };

      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: dbError.message || "Execution engine rollback" },
        { status: 422 },
      );
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid payload formatting structure" },
      { status: 400 },
    );
  }
} */
