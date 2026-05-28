// api/finance/accounts/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { accountFormSchema } from "@/lib/validations/account.schema";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await pool.query(
    `SELECT id, code, name, account_type, parent_id, vat_rate_id, is_summary 
     FROM chart_of_accounts WHERE id = $1 AND company_id = $2`,
    [id, companyId],
  );

  if (!result.rows.length)
    return NextResponse.json(
      { error: "Account lookup out of bounds" },
      { status: 404 },
    );
  return NextResponse.json(result.rows[0]);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
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
    if (parent_id === id)
      return NextResponse.json(
        { error: "Self-parent loop reference rejected" },
        { status: 400 },
      );

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const txCheck = await client.query(
        `SELECT 1 FROM journal_entry_lines WHERE account_id = $1 LIMIT 1`,
        [id],
      );
      if (txCheck.rows.length > 0)
        throw new Error(
          "Immutable operational history exists; structural mutations denied",
        );

      const res = await client.query(
        `
        UPDATE chart_of_accounts 
        SET code = $1, name = $2, account_type = $3, parent_id = $4, vat_rate_id = $5, is_summary = $6, is_posting = $7, updated_at = NOW()
        WHERE id = $8 AND company_id = $9 RETURNING *`,
        [
          code,
          name,
          account_type,
          parent_id,
          vat_rate_id,
          is_summary,
          !is_summary,
          id,
          companyId,
        ],
      );

      await client.query("COMMIT");
      return NextResponse.json(res.rows[0]);
    } catch (err) {
      const dbError = err as { code?: string; message?: string };

      await client.query("ROLLBACK");
      return NextResponse.json({ error: dbError.message }, { status: 422 });
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { error: "Malformed modification schema payload" },
      { status: 400 },
    );
  }
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  const {id} = await params;

  try {
    const result = await client.query(
      `
      SELECT
        id,
        code,
        name,
        account_type,
        parent_id,
        vat_rate_id,
        is_summary,
        is_posting
      FROM chart_of_accounts
      WHERE id = $1
      AND company_id = $2
      `,
      [id, session.user.company_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
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

  const {id} = await params;

  try {
    await client.query("BEGIN");

    // 🔴 1. Prevent editing if transactions exist
    const txCheck = await client.query(
      `SELECT 1 FROM journal_entry_lines WHERE account_id = $1 LIMIT 1`,
      [id]
    );

    if (txCheck.rows.length > 0) {
      throw new Error(
        "This account has transactions and cannot be modified"
      );
    }

    // 🔴 2. VAT validation
    if (is_summary && vat_rate_id) {
      throw new Error("VAT not allowed on summary accounts");
    }

    // 🔴 3. Prevent self-parent
    if (parent_id === id) {
      throw new Error("Account cannot be its own parent");
    }

    // 🔴 4. Parent must be summary
    if (parent_id) {
      const parent = await client.query(
        `SELECT is_summary FROM chart_of_accounts WHERE id = $1`,
        [parent_id]
      );

      if (!parent.rows[0]?.is_summary) {
        throw new Error("Parent must be a summary account");
      }
    }

    // 🔴 5. Unique code check
    const existing = await client.query(
      `SELECT 1 FROM chart_of_accounts 
       WHERE company_id = $1 AND code = $2 AND id != $3`,
      [session.user.company_id, code, id]
    );

    if (existing.rows.length > 0) {
      throw new Error("Account code already exists");
    }

    // ✅ UPDATE
    const result = await client.query(
      `
      UPDATE chart_of_accounts
      SET
        code = $1,
        name = $2,
        account_type = $3,
        parent_id = $4,
        vat_rate_id = $5,
        is_summary = $6,
        is_posting = $7,
        updated_at = now()
      WHERE id = $8
      AND company_id = $9
      RETURNING *
      `,
      [
        code,
        name,
        account_type,
        parent_id || null,
        vat_rate_id || null,
        is_summary,
        is_posting,
        id,
        session.user.company_id,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");

    return NextResponse.json(
      { error: error || "Update failed" },
      { status: 400 }
    );
  } finally {
    client.release();
  }
} */
