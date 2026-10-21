// app/api/setup/general/company/currencies/base/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        cc.id AS company_currency_id,
        cc.currency_id,
        cc.is_base,
        cc.exchange_rate,
        c.code,
        c.name,
        c.symbol
      FROM company_currencies cc
      INNER JOIN currencies c ON c.id = cc.currency_id
      WHERE cc.company_id = $1
        AND cc.is_base = TRUE
        AND cc.status = 1
      LIMIT 1
      `,
      [companyId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "No base currency configured for this company." },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error("Failed to fetch base currency:", error);
    return NextResponse.json(
      { error: "Failed to fetch base currency." },
      { status: 500 }
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
    const { currency_id, company_currency_id } = body;

    if (!currency_id && !company_currency_id) {
      return NextResponse.json(
        { error: "Either currency_id or company_currency_id is required." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // 1. Remove old base currency status for the company
    await client.query(
      `
      UPDATE company_currencies
      SET is_base = FALSE
      WHERE company_id = $1
      `,
      [companyId]
    );

    let targetCompanyCurrencyId = company_currency_id;

    if (!targetCompanyCurrencyId && currency_id) {
      // Check if the currency is already attached to the company
      const checkExisting = await client.query(
        `
        SELECT id
        FROM company_currencies
        WHERE company_id = $1 AND currency_id = $2
        FOR UPDATE
        `,
        [companyId, currency_id]
      );

      if (checkExisting.rowCount && checkExisting.rowCount > 0) {
        targetCompanyCurrencyId = checkExisting.rows[0].id;
      } else {
        // Insert if it doesn't exist in company_currencies yet
        const insertRes = await client.query(
          `
          INSERT INTO company_currencies (
            company_id,
            currency_id,
            is_base,
            exchange_rate,
            status
          )
          VALUES ($1, $2, FALSE, 1.000000, 1)
          RETURNING id
          `,
          [companyId, currency_id]
        );
        targetCompanyCurrencyId = insertRes.rows[0].id;
      }
    }

    // 2. Set the new base currency, force exchange rate to 1, and ensure active status
    const updateRes = await client.query(
      `
      UPDATE company_currencies
      SET is_base = TRUE,
          exchange_rate = 1.000000,
          status = 1
      WHERE id = $1 AND company_id = $2
      RETURNING id, currency_id, is_base, exchange_rate
      `,
      [targetCompanyCurrencyId, companyId]
    );

    if (updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Target company currency record not found." },
        { status: 404 }
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        message: "Base currency updated successfully.",
        data: updateRes.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to set base currency:", error);
    return NextResponse.json(
      { error: "Failed to set base currency." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}