// app/api/setup/general/company/currencies/rates/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { currencyRateSchema } from "@/lib/validations/currency.schema";

function roundRate(value: number, decimals = 6): number {
  return Number(value.toFixed(decimals));
}

export async function GET(req: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const companyCurrencyId =
    searchParams.get("company_currency_id") || searchParams.get("currency_id");

  if (!companyCurrencyId) {
    return NextResponse.json(
      { error: "company_currency_id is required" },
      { status: 400 },
    );
  }

  try {
    const currencyCheck = await pool.query(
      `
      SELECT
        cc.id AS company_currency_id,
        cc.company_id,
        cc.currency_id AS master_currency_id,
        cc.is_base,
        cc.exchange_rate,
        c.code,
        c.name,
        c.symbol

      FROM company_currencies cc
      INNER JOIN currencies c ON c.id = cc.currency_id
      WHERE cc.company_id = $1
        AND cc.id = $2
        AND cc.status = 1
      LIMIT 1
      `,
      [companyId, companyCurrencyId],
    );

    if (currencyCheck.rowCount === 0) {
      return NextResponse.json(
        {
          error:
            "This company currency is not configured for the current company.",
        },
        { status: 404 },
      );
    }

    const currency = currencyCheck.rows[0];

    const historyResult = await pool.query(
      `
        SELECT
          cr.id,
          cr.effective_date,
          cr.rate,
          ROUND((1 / cr.rate)::numeric, 6) AS inverted_exchange_rate,
          cr.created_at

        FROM currency_rates cr
        WHERE cr.company_currency_id = $1
        ORDER BY
          cr.effective_date DESC,
          cr.created_at DESC
        `,
      [companyCurrencyId],
    );

    const rates = historyResult.rows.map((row) => ({
      id: row.id,
      effective_date: row.effective_date,
      rate: Number(row.rate),
      inverted_exchange_rate: Number(row.inverted_exchange_rate),
      created_at: row.created_at,
    }));

    const previousYearsResult = await pool.query(
      `
        SELECT
          AVG(1 / rate)
            AS average_inverted_rate
        FROM currency_rates
        WHERE company_currency_id = $1
          AND effective_date <
              DATE_TRUNC(
                'year',
                CURRENT_DATE
              )
        `,
      [companyCurrencyId],
    );

    const currentYearResult = await pool.query(
      `
        SELECT
          AVG(1 / rate)
            AS average_inverted_rate
        FROM currency_rates
        WHERE company_currency_id = $1
          AND effective_date >=
              DATE_TRUNC(
                'year',
                CURRENT_DATE
              )
          AND effective_date <= CURRENT_DATE
        `,
      [companyCurrencyId],
    );

    const avgPrevYears =
      previousYearsResult.rows[0]?.average_inverted_rate != null
        ? roundRate(
            Number(previousYearsResult.rows[0].average_inverted_rate),
            6,
          )
        : null;

    const avgCurrentYear =
      currentYearResult.rows[0]?.average_inverted_rate != null
        ? roundRate(Number(currentYearResult.rows[0].average_inverted_rate), 6)
        : null;

    return NextResponse.json({
      currency: {
        company_currency_id: currency.company_currency_id,
        master_currency_id: currency.master_currency_id,
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        is_base: currency.is_base,
        exchange_rate: Number(currency.exchange_rate),
      },
      rates,
      avgPrevYears,
      avgCurrentYear,
    });
  } catch (error) {
    console.error("Failed to fetch currency rate history:", error);

    return NextResponse.json(
      { error: "Failed to fetch currency rate history." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const body = await req.json();

    const parsed = currencyRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          errors: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { company_currency_id, currency_id, exchange_rate, start_date } =
      parsed.data;

    // Reject non-positive exchange rates
    if (exchange_rate <= 0) {
      return NextResponse.json(
        { error: "Exchange rate must be greater than zero." },
        { status: 422 },
      );
    }

    await client.query("BEGIN");

    let companyCurrencyId: string | null = null;
    let masterCurrencyId: string | null = null;
    let isBase = false;

    if (company_currency_id) {
      const result = await client.query(
        `
          SELECT
            cc.id,
            cc.currency_id,
            cc.is_base
          FROM company_currencies cc
          WHERE cc.id = $1
            AND cc.company_id = $2
            AND cc.status = 1
          FOR UPDATE
        `,
        [company_currency_id, companyId],
      );

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          { error: "Selected company currency does not exist or is inactive." },
          { status: 422 },
        );
      }

      const row = result.rows[0];
      companyCurrencyId = row.id;
      masterCurrencyId = row.currency_id;
      isBase = Boolean(row.is_base);
    } else if (currency_id) {
      const existingResult = await client.query(
        `
          SELECT id, is_base
          FROM company_currencies
          WHERE company_id = $1 AND currency_id = $2
          FOR UPDATE
        `,
        [companyId, currency_id],
      );

      if (existingResult.rowCount === 0) {
        const insertResult = await client.query(
          `
            INSERT INTO company_currencies (
              company_id,
              currency_id,
              is_base,
              exchange_rate,
              status
            )
            VALUES (
              $1,
              $2,
              FALSE,
              $3,
              1
            )
            RETURNING
              id,
              is_base
            `,
          [companyId, currency_id, exchange_rate],
        );

        companyCurrencyId = insertResult.rows[0].id;
        isBase = Boolean(insertResult.rows[0].is_base);
      } else {
        companyCurrencyId = existingResult.rows[0].id;
        isBase = Boolean(existingResult.rows[0].is_base);
      }

      masterCurrencyId = currency_id;
    }

    if (!companyCurrencyId) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "No valid company currency selected." },
        { status: 422 },
      );
    }

    if (isBase && exchange_rate !== 1) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Base currency rate must always be exactly 1.000000." },
        { status: 422 },
      );
    }

    const finalRate = isBase ? 1 : exchange_rate;

    await client.query(
      `
      INSERT INTO currency_rates (
        company_currency_id,
        rate,
        effective_date
      )
      VALUES (
        $1,
        $2,
        $3
      )
      ON CONFLICT (
        company_currency_id,
        effective_date
      )
      DO UPDATE SET
        rate = EXCLUDED.rate
      `,
      [companyCurrencyId, finalRate, start_date],
    );

    const currentRateResult = await client.query(
      `
        SELECT rate
        FROM currency_rates
        WHERE company_currency_id = $1
          AND effective_date <= CURRENT_DATE
        ORDER BY effective_date DESC
        LIMIT 1
        `,
      [companyCurrencyId],
    );

    if (Number(currentRateResult.rowCount) > 0) {
      const currentRate = Number(currentRateResult.rows[0].rate);

      await client.query(
        `
        UPDATE company_currencies
        SET exchange_rate = $1
        WHERE id = $2 AND company_id = $3
        `,
        [isBase ? 1 : currentRate, companyCurrencyId, companyId],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        company_currency_id: companyCurrencyId,
        currency_id: masterCurrencyId,
        effective_date: start_date,
        exchange_rate: finalRate,
      },
      { status: 200 },
    );
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Failed to save currency rate:", error);

    return NextResponse.json(
      { error: "Failed to save currency rate." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

// const result = await client.query(
//   `
//     SELECT
//       cc.id,
//       cc.currency_id,
//       cc.is_base,
//       cc.exchange_rate,
//       c.code,
//       c.name,
//       c.symbol
//     FROM company_currencies cc
//     INNER JOIN currencies c
//       ON c.id = cc.currency_id
//     WHERE cc.id = $1
//       AND cc.company_id = $2
//       AND cc.status = 1
//     FOR UPDATE
//     `,
//   [company_currency_id, companyId],
// );
// const currencyResult = await client.query(
//   `
//     SELECT
//       id,
//       code,
//       name,
//       symbol
//     FROM currencies
//     WHERE id = $1
//       AND status = 1
//     LIMIT 1
//     `,
//   [currency_id],
// );

// if (currencyResult.rowCount === 0) {
//   await client.query("ROLLBACK");

//   return NextResponse.json(
//     {
//       error: "Selected master currency does not exist.",
//     },
//     { status: 422 },
//   );
// }

// masterCurrencyId = currency_id;

// const existingResult = await client.query(
//   `
//     SELECT
//       id,
//       is_base,
//       exchange_rate
//     FROM company_currencies
//     WHERE company_id = $1
//       AND currency_id = $2
//     FOR UPDATE
//     `,
//   [companyId, masterCurrencyId],
// );
