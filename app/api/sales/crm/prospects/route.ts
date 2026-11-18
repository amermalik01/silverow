
// app/api/sales/crm/prospects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const data = await ProspectService.list(companyId);

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Prospect List API Error:", error);

    return NextResponse.json(
      { error: "Failed to load prospects." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    const userId = session?.user?.id;

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();

    const prospect = await ProspectService.create(
      companyId,
      userId,
      body,
    );

    return NextResponse.json(
      {
        success: true,
        prospect,
        message: "Prospect created successfully.",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Prospect Create API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create prospect.",
      },
      { status: 400 },
    );
  }
}
