// app/api/sales/support-tickets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { SupportTicketService } from "@/lib/services/sales/support-ticket/support-ticket.service";

async function getSession() {
  return getServerSession(authOptions);
}

export async function GET() {
  try {
    const session = await getSession();
    const companyId = session?.user?.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const data = await SupportTicketService.list(companyId);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Support Ticket List API Error:", error);

    return NextResponse.json(
      { error: "Failed to load support tickets." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const companyId = session?.user?.company_id;
    const userId = session?.user?.id;

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();

    const ticket = await SupportTicketService.create(companyId, userId, body);

    return NextResponse.json(
      {
        success: true,
        ticket,
        message: "Support ticket created successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Support Ticket Create API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create support ticket.",
      },
      { status: 400 },
    );
  }
}
