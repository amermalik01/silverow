// app/api/sales/support-tickets/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { SupportTicketService } from "@/lib/services/sales/support-ticket/support-ticket.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getSession() {
  return getServerSession(authOptions);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    const companyId = session?.user?.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const result = await SupportTicketService.getById(companyId, id);

    if (!result) {
      return NextResponse.json(
        { error: "Support ticket not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Support Ticket Detail API Error:", error);

    return NextResponse.json(
      { error: "Failed to load support ticket." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const body: unknown = await request.json();

    const ticket = await SupportTicketService.update(
      companyId,
      userId,
      id,
      body,
    );

    return NextResponse.json({
      success: true,
      ticket,
      message: "Support ticket updated successfully.",
    });
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

    console.error("Support Ticket Update API Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update support ticket.";

    const status = message === "Support ticket not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    const companyId = session?.user?.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    await SupportTicketService.delete(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Support ticket deleted successfully.",
    });
  } catch (error) {
    console.error("Support Ticket Delete API Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete support ticket.";

    const status = message === "Support ticket not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
