
// app/api/sales/crm/prospects/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";
import type { FetchParams } from "@/types/table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid listing parameters." },
        { status: 400 },
      );
    }

    const result = await ProspectService.listPaginated(
      companyId,
      body as FetchParams,
    );

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("Prospect Listing API Error:", error);

    return NextResponse.json(
      { error: "Failed to load prospect listing." },
      { status: 500 },
    );
  }
}
