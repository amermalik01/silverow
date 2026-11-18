// app/api/sales/crm/prospects/[id]/notes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";
import { ProspectNoteSchema } from "@/lib/validations/prospect.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    const userId = session?.user?.id;
    const author = session?.user?.name ?? "Current User";

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body: unknown = await request.json();

    const payload = ProspectNoteSchema.parse(body);

    const note = await ProspectService.createNote(
      companyId,
      userId,
      author,
      id,
      payload,
    );

    return NextResponse.json(
      {
        success: true,
        note,
        message: "Prospect note added successfully.",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Note validation failed.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Prospect Note API Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to add prospect note.";

    const status = message === "Prospect not found." ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
