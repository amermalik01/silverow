// app/api/reports/customer-listing/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      dateAsAt,
      customerIds,
      statusFilters, // { active: boolean, financeCharges: boolean, insuranceCharges: boolean }
      displayFilters, // { showAddresses: boolean, showOtherLocations: boolean }
      format,
    } = body;

    const params: unknown[] = [companyId, dateAsAt || "2026-06-14"];
    let customerFilterClause = "";

    if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
      params.push(customerIds);
      customerFilterClause = `AND p.id = ANY($3)`;
    }

    // Base query extracting core party details along with aggregated address arrays
    const reportQuery = `
      SELECT 
        p.id,
        p.customer_code AS "customerCode",
        p.name,
        p.status,
        p.credit_limit AS "creditLimit",
        COALESCE(
          json_avg.addresses, 
          '[]'::json
        ) AS "addresses"
      FROM public.parties p
      LEFT JOIN (
        SELECT 
          party_id,
          json_agg(
            json_build_object(
              'id', id,
              'label', COALESCE(label, 'Primary Address'),
              'address1', address_1,
              'address2', address_2,
              'city', city,
              'state', state,
              'country', country,
              'postcode', postcode,
              'isPrimary', is_primary,
              'isBilling', is_billing,
              'isShipping', is_shipping
            ) ORDER BY is_primary DESC, label ASC
          ) AS addresses
        FROM public.party_addresses
        GROUP BY party_id
      ) json_avg ON p.id = json_avg.party_id
      WHERE p.company_id = $1
        AND p.is_customer = TRUE
        AND p.created_at <= $2
        ${customerFilterClause}
      ORDER BY p.customer_code ASC;
    `;

    const dbResult = await pool.query(reportQuery, params);
    let records = dbResult.rows;

    // Apply strict legacy system checkbox status logic filters
    if (statusFilters) {
      records = records.filter((rec) => {
        if (statusFilters.active && rec.status !== "active") return false;
        // Extend logic hook branches here if mapping custom attributes for finance/insurance charges
        return true;
      });
    }

    if (format === "json") {
      return NextResponse.json(records);
    }

    // Connect downstream to jsreport for printing layout matching image_628968.png
    const jsreportAuth = Buffer.from(
      `${process.env.JSREPORT_USERNAME}:${process.env.JSREPORT_PASSWORD}`,
    ).toString("base64");
    const jsreportResponse = await fetch(
      `${process.env.JSREPORT_URL}/api/report`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${jsreportAuth}`,
        },
        body: JSON.stringify({
          template: {
            name: "customer-listing-print",
            recipe: "chrome-pdf",
          },
          data: {
            generatedAt: new Date().toLocaleDateString(),
            dateAsAt,
            displayFilters,
            records,
          },
        }),
      },
    );

    if (!jsreportResponse.ok)
      throw new Error("PDF processing pipeline exception.");
    const reportBuffer = await jsreportResponse.arrayBuffer();

    return new NextResponse(Buffer.from(reportBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="customer_listing.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Error" },
      { status: 500 },
    );
  }
}
