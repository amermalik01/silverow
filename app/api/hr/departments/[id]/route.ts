// app/api/hr/departments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { DepartmentService } from "@/lib/services/hr/department.service";

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

    await DepartmentService.update(companyId!, id, body);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 },
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

    await DepartmentService.delete(companyId!, id);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 },
    );
  }
}
