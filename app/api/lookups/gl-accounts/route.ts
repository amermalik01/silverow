// app/api/lookups/gl-accounts/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.company_id) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const companyId = session.user.company_id;

  const { searchParams } = new URL(req.url);

  /**
   * PAGINATION
   */

  const page = Number(searchParams.get("page") || 1);

  const limit = Number(searchParams.get("limit") || 20);

  const offset = (page - 1) * limit;

  /**
   * FILTERS
   */

  const search = searchParams.get("search") || "";

  const code = searchParams.get("code") || "";

  const name = searchParams.get("name") || "";

  const account_type = searchParams.get("account_type") || "";

  const values: (string | number | boolean)[] = [companyId];

  let where = `
    WHERE coa.company_id = $1
    AND coa.is_active = true
    AND coa.is_posting = true
  `;

  /**
   * SEARCH
   */

  if (search) {
    values.push(`%${search}%`);

    where += `
      AND (
        coa.code ILIKE $${values.length}
        OR coa.name ILIKE $${values.length}
      )
    `;
  }

  /**
   * CODE
   */

  if (code) {
    values.push(`%${code}%`);

    where += `
      AND coa.code ILIKE $${values.length}
    `;
  }

  /**
   * NAME
   */

  if (name) {
    values.push(`%${name}%`);

    where += `
      AND coa.name ILIKE $${values.length}
    `;
  }

  /**
   * ACCOUNT TYPE
   */

  if (account_type) {
    values.push(account_type);

    where += `
      AND coa.account_type = $${values.length}
    `;
  }

  try {
    /**
     * TOTAL COUNT
     */

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM chart_of_accounts coa
      ${where}
    `;

    const countResult = await pool.query(countQuery, values);

    const total = countResult.rows[0].total;

    /**
     * DATA
     */

    values.push(limit);

    values.push(offset);

    const dataQuery = `
      SELECT
        coa.id,
        coa.code,
        coa.name,
        coa.account_type,
        coa.description

      FROM chart_of_accounts coa

      ${where}

      ORDER BY coa.code ASC

      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `;

    const result = await pool.query(dataQuery, values);

    return NextResponse.json({
      data: result.rows,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load GL accounts",
      },
      {
        status: 500,
      },
    );
  }
}
