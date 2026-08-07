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
    `SELECT id, code, name, parent_id, vat_rate_id, is_summary, gl_account_type, gl_no_display_as, status, range_start_code, range_end_code
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

    if (category_id === id || sub_category_id === id || heading_id === id) {
      return NextResponse.json(
        { error: "Self-parent loop reference rejected" },
        { status: 400 },
      );
    }

    const finalParentId = heading_id || sub_category_id || category_id || null;
    const isPosting = gl_account_type === "Posting";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const txCheck = await client.query(
        `SELECT 1 FROM journal_entry_lines WHERE account_id = $1 LIMIT 1`,
        [id],
      );
      if (txCheck.rows.length > 0 && !isPosting) {
        throw new Error(
          "Immutable operational history exists; structural mutations denied on historical nodes.",
        );
      }

      const res = await client.query(
        `UPDATE chart_of_accounts 
         SET code = $1, name = $2, gl_account_type = $3, parent_id = $4, vat_rate_id = $5, 
             gl_no_display_as = $6, status = $7, range_start_code = $8, range_end_code = $9, 
             is_posting = $10, updated_at = NOW()
         WHERE id = $11 AND company_id = $12 
         RETURNING *`,
        [
          code,
          name,
          gl_account_type,
          finalParentId,
          vat_rate_id || null,
          gl_no_display_as,
          status,
          range_start_code,
          range_end_code,
          isPosting,
          id,
          companyId,
        ],
      );

      await client.query("COMMIT");
      return NextResponse.json(res.rows[0]);
    } catch (err) {
      const dbError = err as { code?: string; message?: string };
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: dbError.message || "Database execution rollback" },
        { status: 422 },
      );
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { error: "Malformed modification schema payload structure" },
      { status: 400 },
    );
  }
}
