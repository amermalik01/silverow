// api/finance/accounts/predata/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

interface DropdownItem {
  id: string;
  name: string;
  startRangeCode: string;
  endRangeCode: string;
}

export async function POST() {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Extract accounts matching structural tiers
    const query = `
      SELECT id, code, name, gl_account_type, range_start_code, range_end_code
      FROM chart_of_accounts
      WHERE company_id = $1 AND gl_account_type IN ('Category', 'Sub-Category', 'Heading')
      ORDER BY code ASC;
    `;
    const result = await pool.query(query, [companyId]);

    const categories: DropdownItem[] = [];
    const subCategories: DropdownItem[] = [];
    const Headings: DropdownItem[] = [];

    result.rows.forEach((row) => {
      // Map names uniformly to: "Name - Code" format matching legacy schema requirements
      const formattedItem = {
        id: row.id,
        name: `${row.name} - ${row.code}`,
        startRangeCode: row.range_start_code || row.code,
        endRangeCode: row.range_end_code || row.code,
      };

      if (row.gl_account_type === "Category") {
        categories.push(formattedItem);
      } else if (row.gl_account_type === "Sub-Category") {
        subCategories.push(formattedItem);
      } else if (row.gl_account_type === "Heading") {
        Headings.push(formattedItem);
      }
    });

    return NextResponse.json({
      categories,
      subCategories,
      Headings,
      ack: 1,
      error: null,
    });
  } catch (err) {
    console.error("Error building predata collections:", err);
    return NextResponse.json(
      { categories: [], subCategories: [], Headings: [], ack: 0, error: "Internal mapping failure" },
      { status: 500 }
    );
  }
}