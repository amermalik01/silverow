//  app/api/purchase-orders/master-data/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const [
      currenciesRes,
      stagesRes,
      bankAccountsRes,
      paymentTermsRes,
      paymentMethodsRes,
      shipmentMethodsRes,
    ] = await Promise.all([
      client.query(
        `
        SELECT
          c.id,
          c.code,
          c.name,
          cc.exchange_rate,
          cc.is_base
        FROM company_currencies cc
        INNER JOIN currencies c
          ON c.id = cc.currency_id
        WHERE cc.company_id = $1
          AND cc.status = 1
        ORDER BY c.code
        `,
        [companyId],
      ),

      client.query(
        `
        SELECT
          id,
          name,
          rank
        FROM common_order_stages
        WHERE company_id = $1
          AND stage_type = 'purchase_order'
        ORDER BY rank ASC, name ASC
        `,
        [companyId],
      ),

      client.query(
        `
        SELECT
          id,
          bank_name AS name
        FROM bank_accounts
        WHERE company_id = $1
        ORDER BY bank_name
        `,
        [companyId],
      ),

      client.query(
        `
        SELECT
          id,
          name,
          days
        FROM payment_terms
        WHERE company_id = $1
          AND module_type = 'purchases'
          AND is_active = TRUE
        ORDER BY name
        `,
        [companyId],
      ),

      client.query(
        `
        SELECT
          id,
          name
        FROM payment_method
        WHERE company_id = $1
          AND module_type = 'purchases'
          AND is_active = TRUE
        ORDER BY name
        `,
        [companyId],
      ),

      client.query(
        `
        SELECT
          id,
          name
        FROM shipment_method
        WHERE company_id = $1
          AND module_type = 'purchases'
          AND is_active = TRUE
        ORDER BY name
        `,
        [companyId],
      ),
    ]);

    return NextResponse.json({
      currencies: currenciesRes.rows,
      stages: stagesRes.rows,
      bankAccounts: bankAccountsRes.rows,
      paymentTerms: paymentTermsRes.rows,
      paymentMethods: paymentMethodsRes.rows,
      shipmentMethods: shipmentMethodsRes.rows,
    });
  } catch (error) {
    console.error("Purchase Order master data error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
