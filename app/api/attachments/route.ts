// app/api/attachments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const current_module = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    if (!current_module || !recordId) {
      return NextResponse.json(
        { error: "Missing module or record_id." },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `
      SELECT
        att.id,
        att.module,
        att.record_id,
        att.folder,
        att.file_name,
        att.file_key,
        att.file_path,
        att.file_size,
        att.mime_type,
        att.uploaded_by AS created_by,
        att.created_at,
        u.name AS created_by_name
      FROM attachments att
      LEFT JOIN users u
        ON u.id = att.uploaded_by
       AND u.company_id = att.company_id
      WHERE att.company_id = $1
        AND att.module = $2
        AND att.record_id = $3
      ORDER BY att.created_at DESC
      `,
      [session.user.company_id, current_module, recordId],
    );

    return NextResponse.json({
      data: result.rows,
    });
  } catch (error) {
    console.error("GET Attachments Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch attachments." },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const current_module = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    if (!current_module || !recordId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `SELECT
        att.id,
        att.file_name,
        att.file_key,
        att.file_path,
        att.file_size,
        att.mime_type,
        att.uploaded_by,
        att.created_at,
        u.name AS created_by_name
       FROM attachments AS att
       LEFT JOIN users u ON u.id = att.uploaded_by
       WHERE att.company_id = $1 AND att.module = $2 AND att.record_id = $3 
       ORDER BY att.created_at DESC`,
      [session.user.company_id, current_module, recordId],
    );

    return NextResponse.json({ data: result.rows });
  } catch (err) {
    console.error("GET Attachments Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 },
    );
  }
} */
