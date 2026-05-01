// app/api/inventory/items/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import {
  getItemById,
  updateItem,
  deleteItem,
} from "@/lib/services/inventory/item.service";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json(
      {
        error: "Company context missing",
      },
      { status: 400 },
    );
  }

  const data = await getItemById({
    id,
    companyId,
  });

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: Props) {
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

  const { id } = await params;

  const body = await req.json();

  const data = await updateItem({
    id,
    companyId,
    data: body,
  });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Props) {
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

  const { id } = await params;

  const data = await deleteItem({
    id,
    companyId,
  });

  return NextResponse.json(data);
}
