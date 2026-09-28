// /app/api/finance/item-journal/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ItemJournalService } from "@/lib/services/item-journal/item-journal.service";

export async function GET(
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

    const result = await ItemJournalService.getById(companyId, id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Get Item Journal Exception:", error);

    const message =
      error instanceof Error ? error.message : "Failed to read item journal.";

    const status = message === "Item journal not found" ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
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

    const body: unknown = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const input = body as Record<string, unknown>;

    if (!Array.isArray(input.lines)) {
      return NextResponse.json(
        { error: "lines must be an array." },
        { status: 400 },
      );
    }

    const payload = {
      entry_date: String(input.entry_date || ""),

      reference: input.reference == null ? undefined : String(input.reference),

      description:
        input.description == null ? undefined : String(input.description),

      is_posted: false,

      lines: input.lines,
    };

    /**
     * ItemJournalService.update() itself verifies:
     *
     * - journal exists
     * - journal is ITEM_JOURNAL
     * - journal is not posted
     * - payload is valid
     * - old lines are removed
     * - old allocations are removed
     * - replacement lines are inserted
     * - replacement allocations are inserted
     */
    const result = await ItemJournalService.update(companyId, id, payload);

    return NextResponse.json({
      success: true,
      journal: result,
    });
  } catch (error: unknown) {
    console.error("Update Item Journal Exception:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update item journal.";

    let status = 400;

    if (message === "Item journal not found") {
      status = 404;
    } else if (message === "Posted item journal cannot be modified") {
      status = 409;
    } else if (message === "Target journal is not an item journal") {
      status = 400;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
