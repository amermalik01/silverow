// app/api/setup/vat-rates/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const rate = Number(body.rate);

    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 1 and 100 characters" },
        { status: 400 },
      );
    }
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return NextResponse.json(
        { error: "Rate must be a number between 0 and 100" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE vat_rates
         SET name = $1, rate = $2
         WHERE id = $3 AND company_id = $4
         RETURNING id, name, rate`,
        [name, rate, id, session.user.company_id],
      );

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: "VAT rate not found or access denied" },
          { status: 404 },
        );
      }
      return NextResponse.json(result.rows[0]);
    } catch (error) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === "23505") {
        return NextResponse.json(
          { error: "A VAT rate with this name already exists" },
          { status: 409 },
        );
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    // Audit Check: Prevent deletion if this rate is wired to active posting rules
    const usageCheck = await client.query(
      `SELECT id FROM vat_posting_setup 
       WHERE sales_vat_account_id IS NOT NULL 
       AND (vat_rate = (SELECT rate FROM vat_rates WHERE id = $1)) LIMIT 1`,
      [id],
    );

    if (usageCheck.rowCount && usageCheck.rowCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this VAT rate. It is currently linked inside your VAT Posting Setup Matrix.",
        },
        { status: 400 },
      );
    }

    const result = await client.query(
      `DELETE FROM vat_rates WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, session.user.company_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE VAT Rate Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { params } = context;
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, rate } = body;

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      UPDATE vat_rates
      SET name=$1, rate=$2
      WHERE id=$3
      AND company_id=$4
      RETURNING id, name, rate
      `,
      [name, rate, id, session.user.company_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { params } = context;
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      DELETE FROM vat_rates
      WHERE id=$1 AND company_id=$2
      RETURNING id
      `,
      [id, session.user.company_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
} */
