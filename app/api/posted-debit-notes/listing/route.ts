// app/api/posted-debit-notes/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PostedDebitNoteService } from "@/lib/services/posted-debit-notes/debit-note.service";
import { FetchParams } from "@/types/table";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const params: FetchParams = await req.json();
    const result = await PostedDebitNoteService.listPaginated(
      companyId,
      params,
    );

    return NextResponse.json({
      data: result.data,
      totalRecords: result.totalRecords,
    });
  } catch (err) {
    console.error("Posted debit note listing error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load posted debit notes" },
      { status: 500 },
    );
  }
}
