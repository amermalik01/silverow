// app/api/sales/support-tickets/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { SupportTicketService } from "@/lib/services/sales/support-ticket/support-ticket.service";
import type { FetchParams } from "@/types/table";

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

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid listing parameters." },
        { status: 400 },
      );
    }

    const params = body as FetchParams;

    const result = await SupportTicketService.listPaginated(companyId, params);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Support Ticket Listing API Error:", error);

    return NextResponse.json(
      { error: "Failed to load support tickets." },
      { status: 500 },
    );
  }
}
