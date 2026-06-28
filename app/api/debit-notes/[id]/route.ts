// app/api/debit-notes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { DebitNoteService } from "@/lib/services/debit-notes/debit-note.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await DebitNoteService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Debit note not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Debit note get error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load debit note",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { note } = body;

    await client.query("BEGIN");

    // 1. Transactional update to core Debit Note lines and details
    const data = await DebitNoteService.update(companyId, id, body);

    // 2. Downstream ERP Ledger Posting Hooks
    if (note?.status === "posted") {
      await DebitNoteService.postTransactional(client, companyId, id);
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, data });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Debit note update transactional engine crash:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update debit note pipeline",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await DebitNoteService.delete(companyId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Debit note delete error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to delete debit note",
      },
      {
        status: 500,
      },
    );
  }
}
