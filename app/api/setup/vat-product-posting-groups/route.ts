// app/api/setup/vat-product-posting-groups/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, name 
       FROM vat_product_posting_groups 
       WHERE company_id = $1 
       ORDER BY name ASC`,
      [session.user.company_id]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("GET VAT Product Groups Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Name must be between 1 and 100 characters" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO vat_product_posting_groups (company_id, name)
         VALUES ($1, $2)
         RETURNING id, name`,
        [session.user.company_id, name]
      );
      return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        return NextResponse.json({ error: "A product group with this name already exists." }, { status: 409 });
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("POST VAT Product Group Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}