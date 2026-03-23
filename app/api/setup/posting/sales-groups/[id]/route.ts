// app/api/setup/posting/sales-groups/[id]/route.ts

import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req:Request,
  context:{ params:Promise<{id:string}> }
){

  const {id} = await context.params;

  await pool.query(
    `DELETE FROM sales_posting_groups WHERE id=$1`,
    [id]
  );

  return NextResponse.json({success:true});
}