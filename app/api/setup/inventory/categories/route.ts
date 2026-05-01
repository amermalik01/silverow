// app/api/setup/inventory/categories/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getList, createRecord } from "@/lib/services/master-data";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") || "";

  const data = await getList({
    table: "item_categories",
    companyId,
    searchableColumns: ["code", "name"],
    search,
    orderBy: "name",
    orderDirection: "ASC",
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await createRecord({
    table: "item_categories",
    data: {
      ...body,
      company_id: companyId,
      parent_id: body.parent_id || null,
    },
  });

  return NextResponse.json(data);
}
