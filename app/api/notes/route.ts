// app/api/notes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DOMPurify from "isomorphic-dompurify";

function validateNote(subject: unknown, description: unknown) {
  if (typeof subject !== "string" || !subject.trim()) {
    return "Subject is required.";
  }

  if (subject.trim().length > 200) {
    return "Subject cannot exceed 200 characters.";
  }

  if (typeof description !== "string") {
    return "Description is required.";
  }

  const cleanHtml = DOMPurify.sanitize(description, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });

  // Count readable text, not HTML tags or markup.
  const plainText = cleanHtml
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();

  if (!plainText) {
    return "Description is required.";
  }

  if (plainText.length > 500) {
    return "Description cannot exceed 500 characters.";
  }

  return {
    subject: subject.trim(),
    description: cleanHtml,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const moduleName = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    if (!moduleName || !recordId) {
      return NextResponse.json(
        { error: "Module and record_id are required." },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `SELECT
         n.id,
         n.module,
         n.record_id,
         n.subject,
         n.description,
         n.created_at,
         n.created_by,
         u.name AS created_by_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.company_id = $1
         AND n.module = $2
         AND n.record_id = $3
       ORDER BY n.created_at DESC, n.id DESC`,
      [session.user.company_id, moduleName, recordId],
    );

    return NextResponse.json({ data: result.rows });
  } catch (err) {
    console.error("GET Notes Error:", err);

    return NextResponse.json(
      { error: "Failed to fetch notes." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { module, record_id, subject, description } = body;

    if (
      typeof module !== "string" ||
      !module.trim() ||
      typeof record_id !== "string" ||
      !record_id.trim()
    ) {
      return NextResponse.json(
        { error: "Module and record_id are required." },
        { status: 400 },
      );
    }

    const validated = validateNote(subject, description);

    if (typeof validated === "string") {
      return NextResponse.json({ error: validated }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO notes (
         company_id, module, record_id, note,
         subject, description, created_by
       )
       VALUES ($1, $2, $3, $4::text, $5::varchar, $6, $7)
       RETURNING
         id, module, record_id, subject, description,
         created_at, created_by`,
      [
        session.user.company_id,
        module.trim(),
        record_id.trim(),
        validated.subject,
        validated.subject,
        validated.description,
        session.user.id,
      ],
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error("POST Note Error:", err);

    return NextResponse.json(
      { error: "Failed to create note." },
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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = req.nextUrl;
    const currentModule = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    if (!currentModule || !recordId) {
      return NextResponse.json(
        { error: "Module and record_id parameters are required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `SELECT
         n.id,
         n.note,
         n.created_at,
         n.created_by,
         u.name AS created_by_name
       FROM notes n
       LEFT JOIN users u ON u.id = n.created_by
       WHERE n.company_id = $1
         AND n.module = $2
         AND n.record_id = $3
       ORDER BY n.created_at DESC`,
      [session.user.company_id, currentModule, recordId],
    );

    return NextResponse.json({ data: result.rows });
  } catch (err) {
    console.error("GET Notes Error:", err);

    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { module, record_id, note } = body;

    if (!module || !record_id || !note?.trim()) {
      return NextResponse.json(
        { error: "Missing required parameters or empty notes string" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO notes (company_id, module, record_id, note, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, note, created_at`,
      [
        session.user.company_id,
        module,
        record_id,
        note.trim(),
        session.user.id,
      ],
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    console.error("POST Note Error:", err);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}
 */
