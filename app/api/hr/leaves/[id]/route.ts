// app/api/hr/leaves/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { LeaveService } from "@/lib/services/hr/leave.service";

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    const body = await req.json();

    const { id } = await params;

    await LeaveService.update(companyId!, id, body);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to update leave",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    const { id } = await params;

    await LeaveService.delete(companyId!, id);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to delete leave",
      },
      {
        status: 500,
      },
    );
  }
}
