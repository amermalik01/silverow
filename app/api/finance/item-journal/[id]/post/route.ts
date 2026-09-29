// /app/api/finance/item-journal/[id]/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ItemJournalPostingService } from "@/lib/services/item-journal/item-journal-posting.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Item journal ID is required." },
        { status: 400 },
      );
    }

    /**
     * The posting service owns:
     *
     * - journal existence check
     * - journal row locking
     * - posted-state check
     * - posting-date validation
     * - journal-line validation
     * - allocation validation
     * - inventory movement creation
     * - allocation status update
     * - journal finalization
     * - transaction COMMIT / ROLLBACK
     */
    const result = await ItemJournalPostingService.post(companyId, id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Item Journal Posting Exception:", error);

    const message =
      error instanceof Error ? error.message : "Failed to post item journal.";

    let status = 400;

    if (message === "Item journal not found") {
      status = 404;
    } else if (
      message === "Item journal has already been posted" ||
      message.includes("already been posted")
    ) {
      status = 409;
    } else if (
      message.includes("locked for posting") ||
      message.includes("posting date")
    ) {
      status = 400;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
