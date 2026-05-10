// app/api/setup/roles/[id]/permissions/route.ts

import { NextRequest, NextResponse } from "next/server";

import { RoleService } from "@/lib/services/auth/role.service";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await params;

    const data = await RoleService.getPermissions(id);

    return NextResponse.json({
      permission_ids: data,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load permissions",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await params;

    const body = await req.json();

    await RoleService.assignPermissions(id, body.permission_ids || []);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to update permissions",
      },
      {
        status: 500,
      },
    );
  }
}
