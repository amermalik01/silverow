// app/api/attachments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import fs from "fs/promises";

import path from "path";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await pool.query(
      `
      SELECT *
      FROM attachments
      WHERE id = $1
      `,
      [id],
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 },
      );
    }

    const attachment = existing.rows[0];

    if (attachment.file_path) {
      const fullPath = path.join(process.cwd(), "public", attachment.file_path);

      try {
        await fs.unlink(fullPath);
      } catch {
        console.warn("File already removed");
      }
    }

    await pool.query(
      `
      DELETE FROM attachments
      WHERE id = $1
      `,
      [id],
    );

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 },
    );
  }
}
