// app/api/sales/crm/prospects/[id]/activities/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";
import { ProspectActivitySchema } from "@/lib/validations/prospect.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const activities = await ProspectService.listActivities(companyId, id);

    return NextResponse.json(
      { activities },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Prospect Activities API Error:", error);

    return NextResponse.json(
      { error: "Failed to load prospect activities." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    const userId = session?.user?.id;
    const userName = session?.user?.name ?? "Current User";

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body: unknown = await request.json();

    const payload = ProspectActivitySchema.parse(body);

    const activity = await ProspectService.createActivity(
      companyId,
      userId,
      userName,
      id,
      body,
    );

    return NextResponse.json(
      {
        success: true,
        activity,
        message: "Activity logged successfully.",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Activity validation failed.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Prospect Activity Create API Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to log prospect activity.";

    const status = message === "Prospect not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
