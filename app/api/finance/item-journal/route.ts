// app/api/finance/item-journal/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { JournalService } from "@/lib/services/journal.service";

import {
  ItemJournalPayload,
  ItemJournalService,
} from "@/lib/services/item-journal/item-journal.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status");

    const pageParam = Number(searchParams.get("page") || "1");
    const limitParam = Number(searchParams.get("limit") || "20");

    const page = Number.isFinite(pageParam)
      ? Math.max(1, Math.floor(pageParam))
      : 1;

    const limit = Number.isFinite(limitParam)
      ? Math.min(100, Math.max(1, Math.floor(limitParam)))
      : 20;

    let status: "posted" | "unposted" | undefined;

    if (statusParam === "posted") {
      status = "posted";
    } else if (statusParam === "unposted") {
      status = "unposted";
    }

    const result = await JournalService.list(companyId, {
      status,
      source: "ITEM_JOURNAL",
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Item Journal GET error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to load item journals.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const payload: ItemJournalPayload = {
      entry_date: String(input.entry_date || ""),

      reference: input.reference == null ? undefined : String(input.reference),

      description:
        input.description == null ? undefined : String(input.description),

      is_posted: false,

      lines: input.lines,
    };

    /**
     * ItemJournalService.create() always creates
     * the journal as an unposted draft.
     *
     * Posting is handled separately by:
     *
     * POST /api/finance/item-journal/[id]/post
     */
    const result = await ItemJournalService.create(companyId, payload);

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("Item Journal POST error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create item journal.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { JournalService } from "@/lib/services/journal.service";
import { ItemJournalService } from "@/lib/services/item-journal.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);

    let status: "posted" | "unposted" | undefined = undefined;
    if (statusParam === "posted") status = "posted";
    if (statusParam === "unposted") status = "unposted";

    const result = await JournalService.list(companyId, {
      status,
      source: "ITEM_JOURNAL",
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Item Journal Index View Exception:", err);
    return NextResponse.json(
      {
        error: dbError.message || "Failed to load item journals catalog index",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // 🌟 Forward the rich payload directly to the specialized ItemJournalService
    const result = await ItemJournalService.create(companyId, {
      entry_date: body.entry_date,
      reference: body.reference,
      description: body.description,
      lines: body.lines,
    });

    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Item Journal Construction Execution Failure:", err);
    return NextResponse.json(
      {
        error:
          dbError.message ||
          "Failed to create inventory entry adjustment record",
      },
      { status: 500 },
    );
  }
} */
