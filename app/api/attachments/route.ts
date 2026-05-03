// app/api/attachments/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { writeFile } from "fs/promises";
import path from "path";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.company_id;

    const searchParams = req.nextUrl.searchParams;

    const current_module = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    const result = await pool.query(
      `
      SELECT *
      FROM attachments
      WHERE company_id = $1
      AND module = $2
      AND record_id = $3
      ORDER BY created_at DESC
      `,
      [companyId, current_module, recordId],
    );

    return NextResponse.json({
      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.company_id;

    const formData = await req.formData();

    const file = formData.get("file") as File;

    const current_module = formData.get("module") as string;

    const recordId = formData.get("record_id") as string;

    if (!file) {
      return NextResponse.json({ error: "File missing" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const fileName = `${Date.now()}-${file.name}`;

    const uploadDir = path.join(process.cwd(), "public/uploads");

    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const dbPath = `/uploads/${fileName}`;

    const result = await pool.query(
      `
      INSERT INTO attachments (
        company_id,
        module,
        record_id,
        file_name,
        file_path,
        file_size,
        mime_type,
        uploaded_by
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING *
      `,
      [
        companyId,
        current_module,
        recordId,
        file.name,
        dbPath,
        file.size,
        file.type,
        session.user.id,
      ],
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
