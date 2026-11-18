// app/api/sales/crm/prospects/[id]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";
import { ProspectStatusChangeSchema } from "@/lib/validations/prospect.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

    const payload = ProspectStatusChangeSchema.parse(body);

    const prospect = await ProspectService.changeStatus(
      companyId,
      userId,
      id,
      payload.status,
      {
        remarks: payload.remarks ?? null,
        lostReason: payload.lost_reason ?? null,
      },
    );

    return NextResponse.json({
      success: true,
      prospect,
      message: `Prospect status changed to ${payload.status}.`,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid prospect status.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Prospect Status API Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update prospect status.";

    const status = message === "Prospect not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
