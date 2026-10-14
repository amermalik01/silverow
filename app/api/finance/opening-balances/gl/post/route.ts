// app/api/finance/opening-balances/gl/post/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { GLAccountOpeningBalanceService } from "@/lib/services/finance/opening-balances/gl/gl-account-opening-balance.service";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("ids" in body) ||
      !Array.isArray(body.ids)
    ) {
      return NextResponse.json(
        { error: "Invalid request. An 'ids' array is required." },
        { status: 400 },
      );
    }

    if (!body.ids.every((id: unknown) => typeof id === "string")) {
      return NextResponse.json(
        { error: "Every opening balance ID must be a string." },
        { status: 400 },
      );
    }

    const result = await GLAccountOpeningBalanceService.post(
      companyId,
      body.ids,
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("GL opening balance POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to post GL opening balances.",
      },
      { status: 400 },
    );
  }
}
