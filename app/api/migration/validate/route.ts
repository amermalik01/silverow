// app/api/migration/validate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { validateMigration } from "@/lib/migration/migration.service";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const result = await validateMigration("PURCHASE_ORDER_LINES", body.rows, {
      company_id: companyId,
      purchase_order_id: body.purchase_order_id,
    });

    return NextResponse.json({
      rows: result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Validation failed",
      },
      {
        status: 500,
      },
    );
  }
}
