// app/api/sales/crm/prospects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";

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

    const result = await ProspectService.getById(companyId, id);

    if (!result) {
      return NextResponse.json(
        { error: "Prospect not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Prospect Detail API Error:", error);

    return NextResponse.json(
      { error: "Failed to load prospect." },
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

    const prospect = await ProspectService.update(companyId, userId, id, body);

    return NextResponse.json({
      success: true,
      prospect,
      message: "Prospect updated successfully.",
    });
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

    console.error("Prospect Update API Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update prospect.";

    const status = message === "Prospect not found." ? 404 : 400;

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

    await ProspectService.delete(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Prospect deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Prospect Delete API Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to delete prospect.";

    const status = message === "Prospect not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
