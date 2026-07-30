// app/api/sales/sales-orders/customers/route.ts

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
    const customerCode = searchParams.get("customer_code") || "";
    const name = searchParams.get("name") || "";
    const city = searchParams.get("city") || "";
    const postcode = searchParams.get("postcode") || "";
    const email = searchParams.get("email") || "";

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "10", 10))
    );
    const offset = (page - 1) * limit;

    const queryText = `
      WITH filtered_customers AS (
        SELECT
          p.id,
          p.customer_code,
          p.name,
          p.email,
          p.phone,
          p.credit_limit,
          p.currency_id,
          p.vat_reg_no,
          p.anonymous_customer,
          
          -- Finance & Ledger Columns
          p.finance_contact_person,
          p.finance_email,
          p.finance_phone,
          p.finance_fax,
          p.finance_alt_contact,
          p.finance_alt_email,
          p.payment_terms,
          pt.name as paymentterms,
          p.payment_method,
          p.company_reg_no,
          p.payable_bank,
          p.gl_account_receivable,
          p.gl_account_payable,
          p.posting_group,
          p.sales_posting_group_id,
          p.finance_charge,
          p.has_finance_charge,
          p.insurance_charge,
          p.has_insurance_charge,
          p.exclude_from_aging_report,
          
          -- E-Document Flags
          p.e_reminder,
          p.e_statement,
          p.e_invoice,

          -- Bank Account Details
          p.bank_account_name,
          p.bank_sort_code,
          p.bank_account_no,
          p.bank_swift_bic,
          p.bank_iban,
          p.bank_name,
          p.bank_address,

          pa.city,
          pa.postcode,
          COALESCE(c.name, pa.country) AS country,
          COUNT(*) OVER() AS total_count
        FROM parties p
        LEFT JOIN party_addresses pa 
          ON pa.party_id = p.id AND pa.is_primary = true
        LEFT JOIN country c 
          ON pa.country = c.id::text OR pa.country = c.iso
        LEFT JOIN payment_terms pt ON p.payment_terms = pt.id::text AND pt.module_type='sales'
        WHERE p.company_id = $1
          AND (p.is_customer = true)
          AND ($2 = '' OR p.customer_code ILIKE '%' || $2 || '%')
          AND ($3 = '' OR p.name ILIKE '%' || $3 || '%')
          AND ($4 = '' OR pa.city ILIKE '%' || $4 || '%')
          AND ($5 = '' OR pa.postcode ILIKE '%' || $5 || '%')
          AND ($6 = '' OR p.email ILIKE '%' || $6 || '%')
        ORDER BY p.name ASC
        LIMIT $7 OFFSET $8
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
        WHERE party_id IN (SELECT id FROM filtered_customers)
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
            ORDER BY is_billing DESC
          ) as rn
        FROM party_addresses
        WHERE party_id IN (SELECT id FROM filtered_customers)
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
            ORDER BY is_shipping DESC
          ) as rn
        FROM party_addresses
        WHERE party_id IN (SELECT id FROM filtered_customers)
          AND (is_shipping = true OR is_primary = true)
      )
      SELECT 
        fc.*,
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
      FROM filtered_customers fc
      LEFT JOIN ranked_primary_addresses pa ON pa.party_id = fc.id AND pa.rn = 1
      LEFT JOIN ranked_billing_addresses ba ON ba.party_id = fc.id AND ba.rn = 1
      LEFT JOIN ranked_shipping_addresses sa ON sa.party_id = fc.id AND sa.rn = 1
      ORDER BY fc.customer_code DESC;
    `;

    const result = await pool.query(queryText, [
      companyId,
      customerCode,
      name,
      city,
      postcode,
      email,
      limit,
      offset,
    ]);

    const totalCount =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error running optimized customer lookup:", err);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerCode = searchParams.get("customer_code") || "";
    const name = searchParams.get("name") || "";
    const city = searchParams.get("city") || "";
    const postcode = searchParams.get("postcode") || "";
    const email = searchParams.get("email") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "10", 10)),
    );
    const offset = (page - 1) * limit;

    const queryText = `
      WITH filtered_customers AS (
        SELECT
          p.id,
          p.customer_code,
          p.name,
          p.email,
          p.phone,
          pa.city,
          pa.postcode,
          pa.country,
          COUNT(*) OVER() AS total_count
        FROM parties p
        LEFT JOIN party_addresses pa 
          ON pa.party_id = p.id AND pa.is_primary = true
        WHERE p.company_id = $1
          AND (p.is_customer = true)
          AND ($2 = '' OR p.customer_code ILIKE '%' || $2 || '%')
          AND ($3 = '' OR p.name ILIKE '%' || $3 || '%')
          AND ($4 = '' OR pa.city ILIKE '%' || $4 || '%')
          AND ($5 = '' OR pa.postcode ILIKE '%' || $5 || '%')
          AND ($6 = '' OR p.email ILIKE '%' || $6 || '%')
        ORDER BY p.name ASC
        LIMIT $7 OFFSET $8
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
        WHERE party_id IN (SELECT id FROM filtered_customers)
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
        WHERE party_id IN (SELECT id FROM filtered_customers)
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
        WHERE party_id IN (SELECT id FROM filtered_customers)
          AND (is_shipping = true OR is_primary = true)
      )
      SELECT 
        fc.*,
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
      FROM filtered_customers fc
      LEFT JOIN ranked_primary_addresses pa ON pa.party_id = fc.id AND pa.rn = 1
      LEFT JOIN ranked_billing_addresses ba ON ba.party_id = fc.id AND ba.rn = 1
      LEFT JOIN ranked_shipping_addresses sa ON sa.party_id = fc.id AND sa.rn = 1
      ORDER BY fc.name ASC;
    `;

    const result = await pool.query(queryText, [
      companyId,
      customerCode,
      name,
      city,
      postcode,
      email,
      limit,
      offset,
    ]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err: unknown) {
    console.error("Error running optimized customer lookup:", err);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 },
    );
  }
} */
