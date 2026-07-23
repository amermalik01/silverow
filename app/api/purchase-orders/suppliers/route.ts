// app/api/purchase-orders/suppliers/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const supplierCode = searchParams.get("supplier_code") || "";
    const name = searchParams.get("name") || "";
    const city = searchParams.get("city") || "";
    const postcode = searchParams.get("postcode") || "";
    const email = searchParams.get("email") || "";

    const queryText = `
      WITH filtered_suppliers AS (
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
          ON pa.party_id = p.id AND pa.is_primary = true
        WHERE p.company_id = $1
          AND (p.is_supplier = true)
          AND ($2 = '' OR p.supplier_code ILIKE '%' || $2 || '%')
          AND ($3 = '' OR p.name ILIKE '%' || $3 || '%')
          AND ($4 = '' OR pa.city ILIKE '%' || $4 || '%')
          AND ($5 = '' OR pa.postcode ILIKE '%' || $5 || '%')
          AND ($6 = '' OR p.email ILIKE '%' || $6 || '%')
        ORDER BY p.name ASC
        LIMIT 100
      ),
      ranked_primary_addresses AS (
        SELECT 
          party_id,
          'primary' AS address_type,
          label AS name,
          address_1,
          address_2,
          city,
          state as county,
          postcode,
          country,
          phone,
          email,
          ROW_NUMBER() OVER (
            PARTITION BY party_id 
            ORDER BY is_primary DESC
          ) as rn
        FROM party_addresses
        WHERE party_id IN (SELECT id FROM filtered_suppliers)
          AND is_primary = true
      ),
      ranked_billing_addresses AS (
        SELECT 
          party_id,
          'billing' AS address_type,
          label AS name,
          address_1,
          address_2,
          city,
          state as county,
          postcode,
          country,
          phone,
          email,
          ROW_NUMBER() OVER (
            PARTITION BY party_id 
            ORDER BY is_primary DESC
          ) as rn
        FROM party_addresses
        WHERE party_id IN (SELECT id FROM filtered_suppliers)
          AND (is_billing = true OR is_primary = true)
      ),
      ranked_shipping_addresses AS (
        SELECT 
          party_id,
          'shipping' AS address_type,
          label AS name,
          address_1,
          address_2,
          city,
          state as county,
          postcode,
          country,
          phone,
          email,
          ROW_NUMBER() OVER (
            PARTITION BY party_id 
            ORDER BY is_primary DESC
          ) as rn
        FROM party_addresses
        WHERE party_id IN (SELECT id FROM filtered_suppliers)
          AND (is_shipping = true OR is_primary = true)
      )
      SELECT 
        fs.*,
        CASE 
          WHEN pa.party_id IS NOT NULL THEN json_build_object(
            'address_type', pa.address_type,
            'name', pa.name,
            'address_1', pa.address_1,
            'address_2', pa.address_2,
            'city', pa.city,
            'county', pa.county,
            'postcode', pa.postcode,
            'country', pa.country,
            'phone', pa.phone,
            'email', pa.email
          )
          ELSE NULL 
        END as primary_address,
        CASE 
          WHEN ba.party_id IS NOT NULL THEN json_build_object(
            'address_type', ba.address_type,
            'name', ba.name,
            'address_1', ba.address_1,
            'address_2', ba.address_2,
            'city', ba.city,
            'county', ba.county,
            'postcode', ba.postcode,
            'country', ba.country,
            'phone', ba.phone,
            'email', ba.email
          )
          ELSE NULL 
        END as billing_address,
        CASE 
          WHEN sa.party_id IS NOT NULL THEN json_build_object(
            'address_type', sa.address_type,
            'name', sa.name,
            'address_1', sa.address_1,
            'address_2', sa.address_2,
            'city', sa.city,
            'county', sa.county,
            'postcode', sa.postcode,
            'country', sa.country,
            'phone', sa.phone,
            'email', sa.email
          )
          ELSE NULL 
        END as shipping_address
      FROM filtered_suppliers fs
      LEFT JOIN ranked_primary_addresses pa ON pa.party_id = fs.id AND pa.rn = 1
      LEFT JOIN ranked_billing_addresses ba ON ba.party_id = fs.id AND ba.rn = 1
      LEFT JOIN ranked_shipping_addresses sa ON sa.party_id = fs.id AND sa.rn = 1
      ORDER BY fs.name ASC;
    `;

    const result = await pool.query(queryText, [
      companyId,
      supplierCode,
      name,
      city,
      postcode,
      email,
    ]);

    return NextResponse.json({
      data: result.rows,
    });
  } catch (err) {
    console.error("Error running optimized supplier lookup:", err);
    return NextResponse.json(
      { error: "Failed to load suppliers" },
      { status: 500 },
    );
  }
}
