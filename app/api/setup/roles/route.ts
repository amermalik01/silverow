// app/api/setup/roles/route.ts
import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { RoleService } from "@/lib/services/auth/role.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const data = await RoleService.list(companyId);

    return NextResponse.json({
      data,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load roles",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = await req.json();

    const data = await RoleService.create(companyId, body);

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create role",
      },
      {
        status: 500,
      },
    );
  }
}
