// app/api/attachments/folders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  AttachmentFolderError,
  AttachmentFolderService,
} from "@/lib/services/attachments/attachment-folder.service";

type Context = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof AttachmentFolderError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** PATCH { name } — rename; files in the folder follow the new name. */
export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json()) as { name?: string };

    const result = await AttachmentFolderService.rename(companyId, id, body.name);

    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, "Failed to rename folder.");
  }
}

/** DELETE ?move_to=<folderId> — files move to that folder (or the first one). */
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const moveTo = req.nextUrl.searchParams.get("move_to");

    const result = await AttachmentFolderService.remove(companyId, id, moveTo);

    return NextResponse.json({ data: result });
  } catch (error) {
    return errorResponse(error, "Failed to delete folder.");
  }
}
