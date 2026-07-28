//  app/api/migration/execute/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { executeMigration } from "@/lib/migration/migration.service";

export async function POST(req: NextRequest) {
  const company_id = await getCompanyId();
  const body = await req.json();

  const result = await executeMigration(body.module, body.rows, {
    company_id: company_id!,
    purchase_order_id: body.purchase_order_id,
  });

  return NextResponse.json(result);
}
