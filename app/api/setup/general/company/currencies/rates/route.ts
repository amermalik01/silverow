// app/api/setup/general/company/currencies/rates/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { currencyRateSchema } from "@/lib/validations/currency.schema";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const currencyId = searchParams.get("currency_id");
  if (!currencyId)
    return NextResponse.json(
      { error: "Missing scope reference parameter" },
      { status: 400 },
    );

  const result = await pool.query(
    `SELECT id, rate, effective_date
     FROM currency_rates
     WHERE company_id = $1 AND currency_id = $2
     ORDER BY effective_date DESC`,
    [companyId, currencyId],
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = currencyRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { currency_id, rate, effective_date } = parsed.data;

    // Safety check: Prevent changing historical rates on the base currency if its conversion factor isn't 1
    const baseCheck = await pool.query(
      `SELECT is_base FROM company_currencies WHERE company_id = $1 AND currency_id = $2`,
      [companyId, currency_id],
    );

    // Fallback to 0 if rowCount is null or undefined using the nullish coalescing operator (??)
    const rowsFound = baseCheck?.rowCount ?? 0;

    if (rowsFound > 0 && baseCheck.rows[0].is_base && rate !== 1) {
      return NextResponse.json(
        { error: "Base currency rates must remain locked at exactly 1.000000" },
        { status: 422 },
      );
    }

    await pool.query(
      `INSERT INTO currency_rates (company_id, currency_id, rate, effective_date)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, currency_id, effective_date)
       DO UPDATE SET rate = EXCLUDED.rate`,
      [companyId, currency_id, rate, effective_date],
    );

    // Sync back to the main relationship link record if this entry targets today's date
    const todayStr = new Date().toISOString().split("T")[0];
    if (effective_date === todayStr) {
      await pool.query(
        `UPDATE company_currencies SET exchange_rate = $1 WHERE company_id = $2 AND currency_id = $3`,
        [rate, companyId, currency_id],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to append spot update history point:", error);
    return NextResponse.json(
      { error: "Internal ledger insertion exception." },
      { status: 500 },
    );
  }
}

/* import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { z } from "zod";

const schema = z.object({
  currency_id: z.string().uuid(),
  rate: z.number().positive(),
  effective_date: z.string(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;

  const { searchParams } = new URL(req.url);
  const currencyId = searchParams.get("currency_id");

  const result = await pool.query(
    `
    SELECT id, rate, effective_date
    FROM currency_rates
    WHERE company_id = $1 AND currency_id = $2
    ORDER BY effective_date DESC
    `,
    [companyId, currencyId],
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { currency_id, rate, effective_date } = parsed.data;

  await pool.query(
    `
    INSERT INTO currency_rates (company_id, currency_id, rate, effective_date)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (company_id, currency_id, effective_date)
    DO UPDATE SET rate = EXCLUDED.rate
    `,
    [companyId, currency_id, rate, effective_date],
  );

  return NextResponse.json({ success: true });
} */
