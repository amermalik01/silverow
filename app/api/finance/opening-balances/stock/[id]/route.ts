//  app/api/finance/opening-balances/stock/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { StockOpeningBalanceService } from "@/lib/services/finance/opening-balances/stock/stock-opening-balance.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await StockOpeningBalanceService.delete(companyId, id);

    return NextResponse.json({
      message: "Opening balance deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Stock opening balance DELETE error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete opening balance.";

    const status =
      message === "Opening balance not found."
        ? 404
        : message === "Invalid opening balance ID."
          ? 400
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
