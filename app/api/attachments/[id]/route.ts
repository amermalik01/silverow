// app/api/attachments/[id]/route.ts


import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

type Context = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  req: NextRequest,
  { params }: Context,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const { searchParams } = req.nextUrl;

    const current_module = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    if (!current_module || !recordId) {
      return NextResponse.json(
        { error: "Missing attachment context." },
        { status: 400 },
      );
    }

    const existing = await pool.query<{
      id: string;
      file_key: string | null;
      file_name: string;
    }>(
      `
      SELECT id, file_key, file_name
      FROM attachments
      WHERE id = $1
        AND company_id = $2
        AND module = $3
        AND record_id = $4
      LIMIT 1
      `,
      [
        id,
        session.user.company_id,
        current_module,
        recordId,
      ],
    );

    const attachment = existing.rows[0];

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found." },
        { status: 404 },
      );
    }

    /*
     * The same stored file can be referenced by several attachment rows
     * (e.g. copied from a prospect to its customer on conversion). Only
     * remove it from storage when this is the last reference.
     */
    let fileStillUsed = false;

    if (attachment.file_key) {
      const references = await pool.query(
        `
        SELECT 1
        FROM attachments
        WHERE company_id = $1
          AND file_key = $2
          AND id <> $3
        LIMIT 1
        `,
        [session.user.company_id, attachment.file_key, id],
      );
      fileStillUsed = references.rows.length > 0;
    }

    if (attachment.file_key && !fileStillUsed) {
      try {
        await utapi.deleteFiles(attachment.file_key);
      } catch (error) {
        console.error("UploadThing delete error:", error);

        return NextResponse.json(
          { error: "Failed to remove file from storage." },
          { status: 500 },
        );
      }
    }

    await pool.query(
      `
      DELETE FROM attachments
      WHERE id = $1
        AND company_id = $2
        AND module = $3
        AND record_id = $4
      `,
      [
        id,
        session.user.company_id,
        current_module,
        recordId,
      ],
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE Attachment Error:", error);

    return NextResponse.json(
      { error: "Failed to delete attachment." },
      { status: 500 },
    );
  }
}


/* import { NextRequest, NextResponse } from "next/server";
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
} */
