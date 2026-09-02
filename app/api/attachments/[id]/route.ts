// app/api/attachments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
// import fs from "fs/promises";
// import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { UTApi } from "uploadthing/server";
const utapi = new UTApi();

type Context = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Secure tenancy verification constraint matches company_id
    const existing = await pool.query(
      `SELECT id, file_key, file_name FROM attachments WHERE id = $1 AND company_id = $2`,
      [id, session.user.company_id],
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Attachment context not found" },
        { status: 404 },
      );
    }

    const attachment = existing.rows[0];

    if (attachment.file_key) {
      try {
        await utapi.deleteFiles(attachment.file_key);
      } catch (uploadThingError) {
        console.error("UploadThing delete error:", uploadThingError);
        return NextResponse.json(
          { error: "Failed to remove file from storage" },
          { status: 500 },
        );
      }
    }

    await pool.query(
      ` DELETE FROM attachments WHERE id = $1 AND company_id = $2 `,
      [id, session.user.company_id],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE Attachment Error:", err);
    return NextResponse.json(
      { error: "Internal operational structural failure" },
      { status: 500 },
    );
  }
}
