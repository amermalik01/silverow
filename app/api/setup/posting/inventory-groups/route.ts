// app/api/setup/posting/inventory-groups/route.ts
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(){

  const session = await getServerSession(authOptions);

  const result = await pool.query(
    `SELECT id,name
     FROM inventory_posting_groups
     WHERE company_id=$1`,
    [session?.user.company_id]
  );

  return NextResponse.json(result.rows);
}