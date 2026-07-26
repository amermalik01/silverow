// app/api/lookups/gl-accounts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  // Check if we want everything (perfect for small-to-medium lookups/dropdowns)
  const fetchAll = searchParams.get("all") === "true";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 20);
  const offset = (page - 1) * limit;

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

  if (search) {
    values.push(`%${search}%`);
    where += ` AND (coa.code ILIKE $${values.length} OR coa.name ILIKE $${values.length})`;
  }
  if (code) {
    values.push(`%${code}%`);
    where += ` AND coa.code ILIKE $${values.length}`;
  }
  if (name) {
    values.push(`%${name}%`);
    where += ` AND coa.name ILIKE $${values.length}`;
  }
  if (account_type) {
    values.push(account_type);
    where += ` AND coa.account_type = $${values.length}`;
  }

  try {
    const countQuery = `SELECT COUNT(*)::int AS total FROM chart_of_accounts coa ${where}`;
    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    let dataQuery = `
      SELECT coa.id, coa.code, coa.name, coa.account_type, coa.description
      FROM chart_of_accounts coa
      ${where}
      ORDER BY coa.code ASC
    `;

    // Only append LIMIT & OFFSET if we're not asking for all records at once
    if (!fetchAll) {
      values.push(limit);
      values.push(offset);
      dataQuery += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    const result = await pool.query(dataQuery, values);

    return NextResponse.json({
      data: result.rows,
      pagination: fetchAll
        ? null
        : {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load GL accounts" },
      { status: 500 },
    );
  }
}
