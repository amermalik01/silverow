//  app/api/migration/execute/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { executeMigration } from "@/lib/migration/migration.service";

export async function POST(req: NextRequest) {
  try {
    const company_id = await getCompanyId();

    if (!company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { module: moduleName, purchase_order_id, rows } = body;

    if (!purchase_order_id) {
      return NextResponse.json(
        { error: "Target Purchase Order ID is required." },
        { status: 400 },
      );
    }

    const result = await executeMigration(
      moduleName || "PURCHASE_ORDER_LINES",
      rows,
      {
        company_id,
        purchase_order_id,
      },
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("Migration Execute Error:", err);

    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Migration execution failed" },
      { status: 500 },
    );
  }
}

// export async function POST(req: NextRequest) {
//   const company_id = await getCompanyId();
//   const body = await req.json();

//   const result = await executeMigration(body.module, body.rows, {
//     company_id: company_id!,
//     purchase_order_id: body.purchase_order_id,
//   });

//   return NextResponse.json(result);
// }
