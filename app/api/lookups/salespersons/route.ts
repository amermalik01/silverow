// app/api/lookups/salespersons/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Check if we want everything (perfect for small-to-medium lookups/dropdowns)
  const fetchAll = searchParams.get("all") === "true";

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 20);
  const offset = (page - 1) * limit;

  const search = searchParams.get("search") || "";
  const employee_code = searchParams.get("employee_code") || "";
  const display_name = searchParams.get("display_name") || "";
  const email = searchParams.get("email") || "";
  const status = searchParams.get("status") || "active"; // Defaults to active employees

  // Initialize query parameters array safely to enforce type control bounds
  const values: (string | number | boolean)[] = [companyId];

  let where = `
    WHERE emp.company_id = $1
  `;

  // Status constraint check configuration
  if (status) {
    values.push(status);
    where += ` AND emp.status = $${values.length}`;
  }

  // Global query cross match filter board
  if (search) {
    values.push(`%${search}%`);
    where += ` AND (
      emp.employee_code ILIKE $${values.length} 
      OR emp.display_name ILIKE $${values.length}
      OR emp.first_name ILIKE $${values.length}
      OR emp.last_name ILIKE $${values.length}
      OR emp.email ILIKE $${values.length}
    )`;
  }

  if (employee_code) {
    values.push(`%${employee_code}%`);
    where += ` AND emp.employee_code ILIKE $${values.length}`;
  }

  if (display_name) {
    values.push(`%${display_name}%`);
    where += ` AND (emp.display_name ILIKE $${values.length} OR emp.first_name ILIKE $${values.length} OR emp.last_name ILIKE $${values.length})`;
  }

  if (email) {
    values.push(`%${email}%`);
    where += ` AND emp.email ILIKE $${values.length}`;
  }

  try {
    // Total registry calculations count execution
    const countQuery = `SELECT COUNT(*)::int AS total FROM employees emp ${where}`;
    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    // Primary retrieval dataset query execution logic
    let dataQuery = `
      SELECT 
        emp.id, 
        emp.employee_code, 
        COALESCE(emp.display_name, (emp.first_name || ' ' || emp.last_name)) AS display_name, 
        emp.email, 
        emp.phone,
        emp.mobile,
        emp.status,
        emp.hire_date
      FROM employees emp
      ${where}
      ORDER BY emp.employee_code ASC
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
      { error: "Failed to load salespersons registry data" },
      { status: 500 },
    );
  }
}
