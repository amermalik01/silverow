// app/api/setup/posting/inventory-system/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type InventorySystem = "PERPETUAL" | "PERIODIC";

type InventoryCostingMethod = "FIFO" | "WEIGHTED_AVERAGE" | "STANDARD";

const INVENTORY_SYSTEMS: InventorySystem[] = ["PERPETUAL", "PERIODIC"];

const COSTING_METHODS: InventoryCostingMethod[] = [
  "FIFO",
  "WEIGHTED_AVERAGE",
  "STANDARD",
];

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await pool.query(
      `SELECT inventory_system, costing_method
       FROM companies
       WHERE id = $1`,
      [companyId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to load inventory setup:", error);

    return NextResponse.json(
      { error: "Failed to load inventory setup" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const hasInventorySystem = Object.prototype.hasOwnProperty.call(
      body,
      "inventory_system",
    );

    const hasCostingMethod = Object.prototype.hasOwnProperty.call(
      body,
      "costing_method",
    );

    if (!hasInventorySystem && !hasCostingMethod) {
      return NextResponse.json(
        { error: "No valid settings provided" },
        { status: 400 },
      );
    }

    if (
      hasInventorySystem &&
      !INVENTORY_SYSTEMS.includes(body.inventory_system)
    ) {
      return NextResponse.json(
        { error: "Invalid inventory system" },
        { status: 400 },
      );
    }

    if (hasCostingMethod && !COSTING_METHODS.includes(body.costing_method)) {
      return NextResponse.json(
        { error: "Invalid costing method" },
        { status: 400 },
      );
    }

    const values: unknown[] = [];
    const updates: string[] = [];

    if (hasInventorySystem) {
      values.push(body.inventory_system);
      updates.push(`inventory_system = $${values.length}`);
    }

    if (hasCostingMethod) {
      values.push(body.costing_method);
      updates.push(`costing_method = $${values.length}`);
    }

    values.push(companyId);

    const result = await pool.query(
      `UPDATE companies
       SET ${updates.join(", ")},
           updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING inventory_system, costing_method`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...result.rows[0],
    });
  } catch (error) {
    console.error("Failed to save inventory setup:", error);

    return NextResponse.json(
      { error: "Failed to save inventory setup" },
      { status: 500 },
    );
  }
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export async function GET(){

  const session = await getServerSession(authOptions);

  const result = await pool.query(
    `SELECT inventory_system
     FROM companies
     WHERE id=$1`,
    [session?.user.company_id]
  );

  return NextResponse.json(result.rows[0]);
}


export async function PUT(req:Request){

  const session = await getServerSession(authOptions);
  const {inventory_system} = await req.json();

  await pool.query(
    `UPDATE companies
     SET inventory_system=$1
     WHERE id=$2`,
    [inventory_system,session?.user.company_id]
  );

  return NextResponse.json({success:true});
} */
