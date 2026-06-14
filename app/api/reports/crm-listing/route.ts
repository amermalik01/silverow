// app/api/reports/crm-listing/route.ts
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
      crmIds,
      statusFilters, // { active: boolean }
      displayFilters, // { showAddresses: boolean, showOtherLocations: boolean }
      format,
    } = body;

    // Type-safe array instantiation to resolve eslint preference constraints
    const params: unknown[] = [companyId, dateAsAt || "2026-06-14"];
    let crmFilterClause = "";

    if (crmIds && Array.isArray(crmIds) && crmIds.length > 0) {
      params.push(crmIds);
      crmFilterClause = `AND p.id = ANY($3)`;
    }

    // Base query extraction looking specifically for CRM records (is_crm_lead = TRUE or alternative column flag)
    const reportQuery = `
      SELECT 
        p.id,
        p.crm_code AS "crmCode",
        p.name,
        p.status,
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
              'isPrimary', is_primary
            ) ORDER BY is_primary DESC, label ASC
          ) AS addresses
        FROM public.party_addresses
        GROUP BY party_id
      ) json_avg ON p.id = json_avg.party_id
      WHERE p.company_id = $1
        AND p.is_crm_lead = TRUE
        AND p.created_at <= $2
        ${crmFilterClause}
      ORDER BY p.crm_code ASC;
    `;

    const dbResult = await pool.query(reportQuery, params);
    let records = dbResult.rows;

    // Status filter constraints mapping
    if (statusFilters) {
      records = records.filter((rec) => {
        if (statusFilters.active && rec.status !== "active") return false;
        return true;
      });
    }

    console.log('format === ',format)

    if (format === "json") {
      return NextResponse.json(records);
    } else {
      // Connect to your printing layout template downstream
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
              name: "crm-listing-print",
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
          "Content-Disposition": `inline; filename="crm_listing.pdf"`,
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Error" },
      { status: 500 },
    );
  }
}
