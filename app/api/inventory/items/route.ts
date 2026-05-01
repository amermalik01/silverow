// app/api/inventory/items/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createItem, getItemList } from "@/lib/services/inventory/item.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json(
      {
        error: "Company context missing",
      },
      { status: 400 },
    );
  }

  const search = req.nextUrl.searchParams.get("search") || "";

  const data = await getItemList({
    companyId,
    search,
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json(
      {
        error: "Company context missing",
      },
      { status: 400 },
    );
  }

  const body = await req.json();

  const data = await createItem({
    ...body,
    company_id: companyId,
  });

  return NextResponse.json(data);
}
