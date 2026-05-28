// app/api/setup/vat-rates/route.ts

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
      `SELECT id, name, rate, is_active 
       FROM vat_rates 
       WHERE company_id = $1 AND is_active = true
       ORDER BY rate DESC`,
      [session.user.company_id],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch VAT rates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
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
    const rate = Number(body.rate);

    // Business Logic Validations
    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 1 and 100 characters" },
        { status: 400 },
      );
    }
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return NextResponse.json(
        { error: "Rate must be a valid number between 0 and 100" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO vat_rates (company_id, name, rate)
         VALUES ($1, $2, $3)
         RETURNING id, name, rate`,
        [session.user.company_id, name, rate],
      );
      return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
      
      const dbError = error as { code?: string; message?: string };

      if (dbError.code === "23505") {
        // Unique constraint violation
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
    console.error("POST VAT Rate Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
