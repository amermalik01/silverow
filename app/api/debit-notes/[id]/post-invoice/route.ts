// app/api/debit-notes/[id]/post-invoice/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { DebitNotePostingService } from "@/lib/services/debit-notes/debit-note-posting.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;
    const userId = req.headers.get("x-user-id") || undefined;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));

    const result = await DebitNotePostingService.postDebitNote({
      companyId,
      debitNoteId: id,
      userId,
      postingData: {
        posting_date: body.posting_date,
        notes: body.notes,
      },
    });

    return NextResponse.json({
      success: true,
      debitNoteId: result.id,
      debitNoteNo: result.debit_note_no,
      message:
        "Debit note posted cleanly to General Ledger and Accounts Payable.",
    });
  } catch (err: unknown) {
    console.error("[DEBIT_NOTE_POST_FAILURE]:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to post debit note.",
      },
      { status: 500 },
    );
  }
}
