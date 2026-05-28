// app/api/setup/vat-product-posting-groups/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
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
        `UPDATE vat_product_posting_groups
         SET name = $1
         WHERE id = $2 AND company_id = $3
         RETURNING id, name`,
        [name, id, session.user.company_id]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Product group not found" }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    } catch (error) {
      const dbError = error as { code?: string };
      if (dbError.code === "23505") {
        return NextResponse.json({ error: "Another product group already uses this name." }, { status: 409 });
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("PUT VAT Product Group Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    // Audit Check: Prevent deletion if this is assigned inside the posting matrix setup
    const usageCheck = await client.query(
      `SELECT id FROM vat_posting_setup WHERE vat_product_group_id = $1 LIMIT 1`,
      [id]
    );

    if (usageCheck.rowCount && usageCheck.rowCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete group. It is actively linked inside your VAT Posting Setup Matrix." 
      }, { status: 400 });
    }

    const result = await client.query(
      `DELETE FROM vat_product_posting_groups 
       WHERE id = $1 AND company_id = $2 
       RETURNING id`,
      [id, session.user.company_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Product group not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE VAT Product Group Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}