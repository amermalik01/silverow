//  app/api/finance/opening-balances/stock/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import {
  StockOpeningBalancePayload,
  StockOpeningBalanceService,
} from "@/lib/services/finance/opening-balances/stock/stock-opening-balance.service";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await StockOpeningBalanceService.list(companyId);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Stock opening balance GET error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load stock opening balances.",
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

    const payload: StockOpeningBalancePayload = {
      lines: input.lines as StockOpeningBalancePayload["lines"],
    };

    const result = await StockOpeningBalanceService.save(companyId, payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("Stock opening balance POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save stock opening balances.",
      },
      { status: 400 },
    );
  }
}
