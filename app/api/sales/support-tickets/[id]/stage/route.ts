// app/api/sales/support-tickets/[id]/stage/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z, ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { SupportTicketService } from "@/lib/services/sales/support-ticket/support-ticket.service";
import { SUPPORT_TICKET_STAGES } from "@/lib/validations/support-ticket.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const StageSchema = z.object({
  stage: z.enum(SUPPORT_TICKET_STAGES),
});

export async function PUT(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const body: unknown = await request.json();
    const { stage } = StageSchema.parse(body);

    const ticket = await SupportTicketService.changeStage(
      companyId,
      userId,
      id,
      stage,
    );

    return NextResponse.json({
      success: true,
      ticket,
      message: `Ticket stage changed to ${stage}.`,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid ticket stage.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Support Ticket Stage API Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update ticket stage.";

    const status = message === "Support ticket not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
