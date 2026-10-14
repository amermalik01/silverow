// app/api/finance/opening-balances/gl/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import {
  GLAccountOpeningBalancePayload,
  GLAccountOpeningBalanceService,
} from "@/lib/services/finance/opening-balances/gl/gl-account-opening-balance.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await GLAccountOpeningBalanceService.list(companyId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GL opening balance GET error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load GL opening balances.",
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

    const body: unknown = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
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

    const payload: GLAccountOpeningBalancePayload = {
      lines: input.lines as GLAccountOpeningBalancePayload["lines"],
    };

    const result = await GLAccountOpeningBalanceService.save(
      companyId,
      payload,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GL opening balance SAVE error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save GL opening balances.",
      },
      { status: 400 },
    );
  }
}
