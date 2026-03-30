// app/api/admin/companies/route.ts

import { NextResponse } from "next/server";
import { pool, isDatabaseError } from "@/lib/db"; // Import the helper
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as bcrypt from "bcryptjs";

import { initializeCompany } from "@/lib/bootstrap";

export interface Company {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.is_platform_admin === true;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM companies ORDER BY created_at DESC",
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET Companies Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.is_platform_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = await pool.connect();

  try {

    const { name, slug, plan, adminEmail, adminName, adminPassword } =  await req.json();

    if (!name || !slug || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Missing required company or admin info" },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid company slug" },
        { status: 400 },
      );
    }

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [adminEmail.toLowerCase().trim()],
    );

    if (existingUser && existingUser.rowCount! > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    await client.query("BEGIN");

    // Create company
    const companyRes = await client.query(
      `INSERT INTO companies (name, slug, plan)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [name, slug.toLowerCase(), plan || "free"]
    );

    const companyId = companyRes.rows[0].id;

    // Create admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await client.query(
      `INSERT INTO users (email, password_hash, name, company_id, role, is_platform_admin) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminEmail.toLowerCase().trim(),
        hashedPassword,
        adminName,
        companyId,
        "admin", // Role inside the company
        false, // Not a platform/super admin
      ],
    );

    // BOOTSTRAP company defaults
    await initializeCompany(client, companyId);

    await client.query("COMMIT");

    return NextResponse.json(
      { message: "Company and Admin created successfully" },
      { status: 201 },
    );
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    if (isDatabaseError(error)) {
      if (error.code === "23505") {
        // detail will now be typed as string | undefined
        const detail = error.detail || "";

        const message = detail.includes("slug")
          ? "Subdomain already taken"
          : "User email already exists";

        return NextResponse.json({ error: message }, { status: 409 });
      }
    }

    console.error("Transaction Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.is_platform_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const { name, slug, plan, adminEmail, adminName, adminPassword } =
      await req.json();

    // 1. Validation
    if (!name || !slug || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Missing required company or admin info" },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid company slug" },
        { status: 400 },
      );
    }

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [adminEmail.toLowerCase().trim()],
    );

    if (existingUser && existingUser.rowCount! > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 },
      );
    }

    // 2. Start Transaction
    await client.query("BEGIN");

    // 3. Create Company
    const companyRes = await client.query(
      "INSERT INTO companies (name, slug, plan) VALUES ($1, $2, $3) RETURNING id",
      [name, slug.toLowerCase().trim(), plan || "free"],
    );
    const companyId = companyRes.rows[0].id;

    // 4. Hash Password and Create Admin User
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO users (email, password_hash, name, company_id, role, is_platform_admin) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminEmail.toLowerCase().trim(),
        hashedPassword,
        adminName,
        companyId,
        "admin", // Role inside the company
        false, // Not a platform/super admin
      ],
    );

    createDefaultVatRates(companyId);
    createDefaultPostingGroups(companyId);

    // 5. Commit Transaction
    await client.query("COMMIT");

    return NextResponse.json(
      { message: "Company and Admin created successfully" },
      { status: 201 },
    );
  } catch (error: unknown) {
    // Always rollback first to free up the client
    await client.query("ROLLBACK");

    if (isDatabaseError(error)) {
      if (error.code === "23505") {
        // detail will now be typed as string | undefined
        const detail = error.detail || "";

        const message = detail.includes("slug")
          ? "Subdomain already taken"
          : "User email already exists";

        return NextResponse.json({ error: message }, { status: 409 });
      }
    }

    console.error("Transaction Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

async function createDefaultVatRates(companyId: string) {

  const client = await pool.connect();

  try {

    const defaults = await client.query(
      `SELECT name, rate FROM default_vat_rates`
    );

    for (const vat of defaults.rows) {

      await client.query(
        `
        INSERT INTO vat_rates
        (company_id, name, rate)
        VALUES ($1,$2,$3)
        `,
        [companyId, vat.name, vat.rate]
      );

    }

  } finally {
    client.release();
  }
}

async function createDefaultPostingGroups(companyId: string) {
  const client = await pool.connect();
  try {
    const defaults = await client.query(`SELECT name FROM default_posting_groups`);
    for (const pg of defaults.rows) {
      await client.query(
        `INSERT INTO posting_groups (company_id, name) VALUES ($1,$2)`,
        [companyId, pg.name]
      );
    }
  } finally {
    client.release();
  }
} */

/* export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, slug, plan } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and Slug are required" }, { status: 400 });
    }

    const result = await pool.query(
      "INSERT INTO companies (name, slug, plan) VALUES ($1, $2, $3) RETURNING *",
      [name, slug.toLowerCase().trim(), plan || 'free']
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    // Using your new helper utility
    if (isDatabaseError(error)) {
      // 23505 = Unique Violation (Slug already exists)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: "This subdomain is already taken" }, 
          { status: 409 }
        );
      }
    }

    console.error("POST Company Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
} */
