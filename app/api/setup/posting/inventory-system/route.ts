// app/api/setup/posting/inventory-system/route.ts

import { NextResponse } from "next/server";
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
}