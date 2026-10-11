// app/api/finance/opening-balances/customer/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import { CustomerSupplierOpeningBalanceService } from "@/lib/services/finance/opening-balances/customer-supplier-opening-balance.service";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await req.json();

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const id = typeof payload.id === "string" ? payload.id.trim() : "";

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Opening balance record ID is required" },
        { status: 400 },
      );
    }

    const postedBy =
      typeof payload.postedBy === "string" && payload.postedBy.trim()
        ? payload.postedBy.trim()
        : undefined;

    await CustomerSupplierOpeningBalanceService.post(
      companyId,
      id,
      "customer",
      postedBy,
    );

    return NextResponse.json({
      success: true,
      message: "Customer opening balance posted successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to post customer opening balance";

    console.error("Customer opening balance posting error:", error);

    const status =
      message === "Opening balance record not found."
        ? 404
        : message.includes("Unauthorized")
          ? 401
          : message.includes("already been posted") ||
              message.includes("Only open") ||
              message.includes("must be greater than zero") ||
              message.includes("cannot have both") ||
              message.includes("not configured") ||
              message.includes("No G/L control account") ||
              message.includes("posting date") ||
              message.includes("Posting date") ||
              message.includes("Invalid opening balance") ||
              message.includes("local currency") ||
              message.includes("must be different") ||
              message.includes("not balanced")
            ? 400
            : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
