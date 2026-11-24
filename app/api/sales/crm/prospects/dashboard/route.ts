// app/api/sales/crm/prospects/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/sales/crm/prospects/dashboard?from=yyyy-MM-dd&to=yyyy-MM-dd&dueBefore=ISO
 * KPI counts, status funnel, follow-ups due and recent activity.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const data = await ProspectService.getDashboard(companyId, {
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      dueBefore: searchParams.get("dueBefore"),
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: unknown) {
    console.error("Prospect Dashboard API Error:", error);

    return NextResponse.json(
      { error: "Failed to load prospect dashboard." },
      { status: 500 },
    );
  }
}
