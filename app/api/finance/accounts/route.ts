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
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `

      WITH RECURSIVE account_tree AS (
          SELECT
            id,
            name,
            parent_id,
            id AS root_id,
            name AS category,
            NULL::text AS sub_category,
            1 AS level
          FROM chart_of_accounts
          WHERE parent_id IS NULL

          UNION ALL

          SELECT
            a.id,
            a.name,
            a.parent_id,
            t.root_id,

            t.category,

            CASE
              WHEN t.level = 1 THEN a.name
              ELSE t.sub_category
            END,

            t.level + 1
          FROM chart_of_accounts a
          JOIN account_tree t ON a.parent_id = t.id
        )

        SELECT
          a.id,
          a.code,
          a.name,
          a.account_type,

          t.category,
          t.sub_category,


          CASE
            WHEN COALESCE(SUM(l.debit),0) - COALESCE(SUM(l.credit),0) >= 0
            THEN COALESCE(SUM(l.debit),0) - COALESCE(SUM(l.credit),0)
            ELSE 0
          END AS debit,

          CASE
            WHEN COALESCE(SUM(l.debit),0) - COALESCE(SUM(l.credit),0) < 0
            THEN ABS(COALESCE(SUM(l.debit),0) - COALESCE(SUM(l.credit),0))
            ELSE 0
          END AS credit

        FROM chart_of_accounts a

        LEFT JOIN account_tree t ON t.id = a.id

        LEFT JOIN journal_entry_lines l
          ON l.account_id = a.id

        LEFT JOIN journal_entries j
          ON j.id = l.journal_id
          AND j.is_posted = true

        WHERE a.company_id = $1
         AND (
                a.is_posting = true
                OR NOT EXISTS (
                  SELECT 1
                  FROM chart_of_accounts c2
                  WHERE c2.parent_id = a.id
                )
              )

        GROUP BY a.id, t.category, t.sub_category
        ORDER BY a.code



      `,
      [companyId],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const {
    code,
    name,
    account_type,
    parent_id,
    vat_rate_id,
    is_summary,
    is_posting,
  } = body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ❗ VALIDATIONS

    // 1. VAT only for posting accounts
    if (is_summary && vat_rate_id) {
      throw new Error("VAT can only be assigned to posting accounts");
    }

    // 2. Parent must be summary
    if (parent_id) {
      const parent = await client.query(
        `SELECT is_summary FROM chart_of_accounts WHERE id = $1`,
        [parent_id],
      );

      if (!parent.rows.length) {
        throw new Error("Parent account not found");
      }

      if (!parent.rows[0].is_summary) {
        throw new Error("Parent must be a summary account");
      }
    }

    // 3. Unique code per company
    const existing = await client.query(
      `SELECT 1 FROM chart_of_accounts WHERE company_id = $1 AND code = $2`,
      [companyId, code],
    );

    if (existing.rows.length > 0) {
      throw new Error("Account code already exists");
    }

    // ✅ INSERT

    const result = await client.query(
      `
      INSERT INTO chart_of_accounts (
        company_id,
        code,
        name,
        account_type,
        parent_id,
        vat_rate_id,
        is_summary,
        is_posting
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        companyId,
        code,
        name,
        account_type,
        parent_id || null,
        vat_rate_id || null,
        is_summary,
        is_posting,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");

    return NextResponse.json({ error: error }, { status: 500 });
    
  } finally {
    client.release();
  }
}
 */
