// app/api/finance/opening-balances/stock/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockOpeningBalanceService } from "@/lib/services/finance/opening-balances/stock/stock-opening-balance.service";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !Array.isArray(body.ids)) {
      return NextResponse.json(
        { error: "Invalid request. 'ids' array is required." },
        { status: 400 },
      );
    }

    const result = await StockOpeningBalanceService.post(
      companyId,
      body.ids,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    console.error("Stock opening balance POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to post stock opening balances.",
      },
      { status: 400 },
    );
  }
}