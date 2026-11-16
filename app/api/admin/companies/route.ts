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
    // const { name, slug, plan, adminEmail, adminName, adminPassword } =  await req.json();
    const {
      name,
      slug,
      plan,
      adminEmail,
      adminName,
      adminPassword,
      inventorySystem = "PERIODIC",
      costingMethod = "FIFO",
    } = await req.json();

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

    const validInventorySystems = ["PERIODIC", "PERPETUAL"];

    const validCostingMethods = [
      "FIFO",
      "LIFO",
      "WEIGHTED_AVERAGE",
      "STANDARD",
    ];

    if (!validInventorySystems.includes(inventorySystem)) {
      return NextResponse.json(
        { error: "Invalid inventory system" },
        { status: 400 },
      );
    }

    if (!validCostingMethods.includes(costingMethod)) {
      return NextResponse.json(
        { error: "Invalid costing method" },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    // Create company

    const companyRes = await client.query(
      `
      INSERT INTO companies (
        name,
        slug,
        plan,
        inventory_system,
        costing_method
      )
      VALUES ($1, $2, $3, $4::inventory_system_enum,
              $5::inventory_costing_method_enum)
      RETURNING id
      `,
      [
        name.trim(),
        slug.toLowerCase().trim(),
        plan || "free",
        inventorySystem,
        costingMethod,
      ],
    );

    const companyId: string = companyRes.rows[0].id;
    // const companyRes = await client.query(
    //   `INSERT INTO companies (name, slug, plan)
    //    VALUES ($1, $2, $3)
    //    RETURNING id`,
    //   [name, slug.toLowerCase(), plan || "free"],
    // );

    // const companyId = companyRes.rows[0].id;

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
