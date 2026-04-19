// app/api/setup/general/company/currencies/rates/route.ts

import { NextResponse } from "next/server";
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
}
