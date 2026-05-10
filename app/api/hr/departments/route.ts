// app/api/hr/departments/route.ts
import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { DepartmentService } from "@/lib/services/hr/department.service";

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

    const data = await DepartmentService.list(companyId);

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load departments",
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

    const body = await req.json();

    const result = await DepartmentService.create(companyId!, body);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to create department",
      },
      {
        status: 500,
      },
    );
  }
}
