// app/api/notes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DOMPurify from "isomorphic-dompurify";

type Context = {
  params: Promise<{ id: string }>;
};

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

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
    const updateQry = `UPDATE notes
       SET subject = $1::varchar,
           description = $2,
           note = $1::text
       WHERE id = $3
         AND company_id = $4
         AND module = $5
         AND record_id = $6
       RETURNING
         id, module, record_id, subject, description,
         created_at, created_by`;

    const updateParam = [
      validated.subject,
      validated.description,
      id,
      session.user.company_id,
      module.trim(),
      record_id.trim(),
    ];

    console.log("updateQry ==== ", updateQry);
    console.log("updateParam ==== ", updateParam);

    const result = await pool.query(updateQry, updateParam);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    console.error("PUT Note Error:", err);

    return NextResponse.json(
      { error: "Failed to update note." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
      `DELETE FROM notes
       WHERE id = $1
         AND company_id = $2
         AND module = $3
         AND record_id = $4`,
      [id, session.user.company_id, moduleName, recordId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE Note Error:", err);

    return NextResponse.json(
      { error: "Failed to delete note." },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const { note, module, record_id } = body;

    if (typeof note !== "string" || !note.trim() || !module || !record_id) {
      return NextResponse.json(
        { error: "Note, module, and record_id are required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE notes
       SET note = $1
       WHERE id = $2
         AND company_id = $3
         AND module = $4
         AND record_id = $5
       RETURNING id, note, created_at, created_by`,
      [note.trim(), id, session.user.company_id, module, record_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    console.error("PUT Note Error:", err);

    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 },
    );
  }
}

// Delete an existing note
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = req.nextUrl;

    const moduleName = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    if (!module || !recordId) {
      return NextResponse.json(
        { error: "Module and record_id are required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `DELETE FROM notes
       WHERE id = $1
         AND company_id = $2
         AND module = $3
         AND record_id = $4`,
      [id, session.user.company_id, moduleName, recordId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE Note Error:", err);

    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
} */
