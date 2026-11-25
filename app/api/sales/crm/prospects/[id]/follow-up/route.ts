// app/api/sales/crm/prospects/[id]/follow-up/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z, ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const optionalDate = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, "Date must be in YYYY-MM-DD format.")
    .nullable(),
);

const FollowUpSchema = z.object({
  last_contacted_at: optionalDate,
  next_follow_up_at: optionalDate,
  reminder_enabled: z.boolean().default(false),
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
    const payload = FollowUpSchema.parse(body);

    const prospect = await ProspectService.updateFollowUp(
      companyId,
      userId,
      id,
      payload,
    );

    return NextResponse.json({
      success: true,
      prospect,
      message: "Follow-up updated.",
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message || "Invalid follow-up details.",
        },
        { status: 400 },
      );
    }

    console.error("Prospect Follow-up API Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update follow-up.";
    const status = message === "Prospect not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
