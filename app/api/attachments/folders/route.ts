// app/api/attachments/folders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  AttachmentFolderError,
  AttachmentFolderService,
  MAX_ATTACHMENT_FOLDERS,
} from "@/lib/services/attachments/attachment-folder.service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof AttachmentFolderError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** GET /api/attachments/folders?module=prospect */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const module = req.nextUrl.searchParams.get("module");
    if (!module) {
      return NextResponse.json({ error: "Missing module." }, { status: 400 });
    }

    const result = await AttachmentFolderService.list(companyId, module);

    return NextResponse.json({ ...result, max_folders: MAX_ATTACHMENT_FOLDERS }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error, "Failed to load folders.");
  }
}

/** POST /api/attachments/folders  { module, name } */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { module?: string; name?: string };
    if (!body.module) {
      return NextResponse.json({ error: "Missing module." }, { status: 400 });
    }

    const folder = await AttachmentFolderService.create(
      companyId,
      session?.user?.id ?? null,
      body.module,
      body.name,
    );

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Failed to create folder.");
  }
}

/** PUT /api/attachments/folders  { module, order: folderId[] } — re-position */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { module?: string; order?: unknown };
    if (!body.module) {
      return NextResponse.json({ error: "Missing module." }, { status: 400 });
    }

    const folders = await AttachmentFolderService.reorder(
      companyId,
      body.module,
      body.order,
    );

    return NextResponse.json({ folders });
  } catch (error) {
    return errorResponse(error, "Failed to reorder folders.");
  }
}
