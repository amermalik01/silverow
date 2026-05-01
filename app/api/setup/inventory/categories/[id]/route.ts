// app/api/setup/inventory/categories/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import {
  getById,
  updateRecord,
  deleteRecord,
} from "@/lib/services/master-data";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getById({
    table: "item_categories",
    id,
    companyId,
  });

  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const data = await updateRecord({
    table: "item_categories",
    id,
    data: body,
    companyId,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteRecord({
    table: "item_categories",
    id,
    companyId,
  });

  return NextResponse.json({
    success: true,
  });
}
