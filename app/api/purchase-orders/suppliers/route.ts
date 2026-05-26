// app/api/purchase-orders/suppliers/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { searchParams } = new URL(req.url);

    const supplierCode = searchParams.get("supplier_code") || "";

    const name = searchParams.get("name") || "";

    const city = searchParams.get("city") || "";

    const postcode = searchParams.get("postcode") || "";

    const email = searchParams.get("email") || "";

    const result = await pool.query(
      `
      SELECT
        p.id,

        p.supplier_code,

        p.name,

        p.email,
        p.phone,

        pa.city,
        pa.postcode,
        pa.country

      FROM parties p

      LEFT JOIN party_addresses pa
        ON pa.party_id = p.id
        AND pa.is_primary = true

      WHERE p.company_id = $1

      AND (
        p.type = 'supplier'
        OR p.type = 'both'
      )

      AND (
        $2 = ''
        OR p.supplier_code ILIKE '%' || $2 || '%'
      )

      AND (
        $3 = ''
        OR p.name ILIKE '%' || $3 || '%'
      )

      AND (
        $4 = ''
        OR pa.city ILIKE '%' || $4 || '%'
      )

      AND (
        $5 = ''
        OR pa.postcode ILIKE '%' || $5 || '%'
      )

      AND (
        $6 = ''
        OR p.email ILIKE '%' || $6 || '%'
      )

      ORDER BY p.name ASC
      LIMIT 100
      `,
      [companyId, supplierCode, name, city, postcode, email],
    );

    const suppliers = [];

    for (const row of result.rows) {
      /**
       * BILLING ADDRESS
       */
      const billingResult = await pool.query(
        `
          SELECT
            'billing' AS address_type,

            label AS name,

            address_1,
            address_2,

            city,
            state,
            postcode,
            country,

            phone,
            email

          FROM party_addresses

          WHERE party_id = $1
          AND (
            is_billing = true
            OR is_primary = true
          )

          ORDER BY is_primary DESC
          LIMIT 1
          `,
        [row.id],
      );
      // address_type = 'billing'

      /**
       * SHIPPING ADDRESS
       */
      const shippingResult = await pool.query(
        `
          SELECT
            'shipping' AS address_type,

            label AS name,

            address_1,
            address_2,

            city,
            state,
            postcode,
            country,

            phone,
            email

          FROM party_addresses

          WHERE party_id = $1
          AND (
            is_shipping = true
            OR is_primary = true
          )

          ORDER BY is_primary DESC
          LIMIT 1
          `,
        [row.id],
      );
      // address_type = 'shipping'

      suppliers.push({
        ...row,

        billing_address: billingResult.rows[0] || null,

        shipping_address: shippingResult.rows[0] || null,
      });
    }

    return NextResponse.json({
      data: suppliers,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load suppliers",
      },
      {
        status: 500,
      },
    );
  }
}
