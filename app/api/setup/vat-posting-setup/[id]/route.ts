// app/api/setup/vat-posting-setup/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM vat_posting_setup
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [id, session.user.company_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Matrix group record assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE VAT Posting Matrix Row Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req:Request,
  context:{ params:Promise<{id:string}> }
){

  const {id} = await context.params;
  const session = await getServerSession(authOptions);

  const client = await pool.connect();

  try{

    await client.query(
      `DELETE FROM vat_posting_setup
       WHERE id=$1 AND company_id=$2`,
      [id,session?.user.company_id]
    );

    return NextResponse.json({success:true});

  } finally{
    client.release();
  }
} */