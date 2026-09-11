// app/api/setup/general/company/currencies/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { companyCurrencySchema } from "@/lib/validations/currency.schema";
import { validateCompanyCurrencyState } from "@/lib/validations/currencyGate";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT
            cc.id AS company_currency_id,
            cc.company_id,
            cc.currency_id,
            c.code,
            c.name,
            c.symbol,
            cc.is_base,
            cc.exchange_rate,
            cc.status,

            (
                SELECT cr.effective_date
                FROM currency_rates cr
                WHERE cr.company_currency_id = cc.id
                  AND cr.effective_date <= CURRENT_DATE
                ORDER BY cr.effective_date DESC
                LIMIT 1
            ) AS effective_date

        FROM company_currencies cc

        INNER JOIN currencies c
            ON c.id = cc.currency_id

        WHERE cc.company_id = $1
          AND cc.status = 1

        ORDER BY cc.is_base DESC, c.code;`,
      [companyId],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read system currency assignments" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = companyCurrencySchema.safeParse(body);

    if (!parsed.success) {
      const formatted = parsed.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json({ errors: formatted }, { status: 400 });
    }

    const { currency_id, exchange_rate, is_base } = parsed.data;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Execute deep business logic validation checks
      const gate = await validateCompanyCurrencyState(
        client,
        companyId,
        currency_id,
        exchange_rate,
        is_base,
      );

      if (!gate.valid) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: gate.reason }, { status: 422 });
      }

      // If this record is declared base, remove base privileges from all other currencies
      if (is_base) {
        await client.query(
          `UPDATE company_currencies SET is_base = false WHERE company_id = $1`,
          [companyId],
        );
      }

      // 1. Insert or update company currency record and return the ID
      const compCurrRes = await client.query(
        ` INSERT INTO company_currencies (company_id, currency_id, exchange_rate, is_base, status)
          VALUES ($1, $2, $3, $4, 1)
          ON CONFLICT (company_id, currency_id)
          DO UPDATE SET exchange_rate = EXCLUDED.exchange_rate, is_base = EXCLUDED.is_base, status = 1
          RETURNING id`,
        [companyId, currency_id, exchange_rate, is_base],
      );

      const companyCurrencyId = compCurrRes.rows[0].id;

      // 2. Insert into currency_rates linked by company_currency_id
      await client.query(
        ` INSERT INTO currency_rates (company_currency_id, rate, effective_date)
          VALUES ($1, $2, CURRENT_DATE)
          ON CONFLICT (company_currency_id, effective_date)
          DO UPDATE SET rate = EXCLUDED.rate`,
        [companyCurrencyId, exchange_rate],
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (txError) {
      await client.query("ROLLBACK");
      console.error("Currency persistence transaction failed:", txError);
      return NextResponse.json(
        { error: "Transactional database rejection occurred." },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Malformed payload parsing parameters." },
      { status: 400 },
    );
  }
}
