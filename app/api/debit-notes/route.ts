// app/api/debit-notes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { DebitNoteService } from "@/lib/services/debit-notes/debit-note.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await DebitNoteService.list(companyId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Debit note list error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load debit notes",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const data = await DebitNoteService.create(companyId, body);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 201,
      },
    );
  } catch (err) {
    console.error("Debit note create error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to create debit note",
      },
      {
        status: 500,
      },
    );
  }
}
