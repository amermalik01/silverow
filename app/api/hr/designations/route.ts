// app/api/hr/designations/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { DesignationService } from "@/lib/services/hr/designation.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await DesignationService.list(companyId);

    return NextResponse.json({
      data,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load designations",
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const result = await DesignationService.create(companyId, body);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to create designation",
      },
      {
        status: 500,
      },
    );
  }
}
