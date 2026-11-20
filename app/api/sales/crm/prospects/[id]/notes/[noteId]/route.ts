// app/api/sales/crm/prospects/[id]/notes/[noteId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";

type Context = {
  params: Promise<{
    id: string;
    noteId: string;
  }>;
};

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, noteId } = await params;
    const body: unknown = await req.json();

    const note = await ProspectService.updateNote(
      session.user.company_id,
      id,
      noteId,
      body,
    );

    return NextResponse.json({
      success: true,
      data: note,
    });
  } catch (error) {
    console.error("PUT Prospect Note Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update prospect note.";

    const status = message.includes("not found")
      ? 404
      : message.includes("converted")
        ? 409
        : message.includes("required") || message.includes("Invalid")
          ? 400
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, noteId } = await params;

    await ProspectService.deleteNote(session.user.company_id, id, noteId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE Prospect Note Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete prospect note.";

    const status = message.includes("not found")
      ? 404
      : message.includes("converted")
        ? 409
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
