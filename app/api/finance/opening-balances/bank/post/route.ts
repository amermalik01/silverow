// app/api/finance/opening-balances/bank/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { BankOpeningBalanceService } from "@/lib/services/finance/opening-balances/bank/bank-opening-balance.service";

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body: unknown = await req.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const id =
      typeof payload.id === "string" ? payload.id.trim() : "";

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

    await client.query("BEGIN");
    transactionStarted = true;

    const data = await BankOpeningBalanceService.postWithClient(
      client,
      companyId,
      id,
      postedBy,
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Bank opening balance posted successfully",
      data,
    });
  } catch (error: unknown) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Bank opening balance rollback error:", rollbackError);
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to post bank opening balance";

    console.error("Bank opening balance posting error:", error);

    const notFound =
      message === "Opening balance record not found" ||
      message === "Bank account not found" ||
      message === "Currency not found" ||
      message === "Supplier not found" ||
      message === "Customer not found" ||
      message.includes("G/L account was not found");

    const badRequest =
      message.includes("Unauthorized") ||
      message.includes("required") ||
      message.includes("configured") ||
      message.includes("already been posted") ||
      message.includes("Only open") ||
      message.includes("must be") ||
      message.includes("cannot be") ||
      message.includes("Invalid") ||
      message.includes("not an active") ||
      message.includes("not a posting") ||
      message.includes("not match");

    return NextResponse.json(
      { success: false, error: message },
      {
        status: message.includes("Unauthorized")
          ? 401
          : notFound
            ? 404
            : badRequest
              ? 400
              : 500,
      },
    );
  } finally {
    client.release();
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import { BankOpeningBalanceService } from "@/lib/services/finance/opening-balances/bank/bank-opening-balance.service";

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
        {
          success: false,
          error: "Opening balance record ID is required",
        },
        { status: 400 },
      );
    }

    const postedBy =
      typeof payload.postedBy === "string" && payload.postedBy.trim()
        ? payload.postedBy.trim()
        : undefined;

    await BankOpeningBalanceService.post(companyId, id, postedBy);

    return NextResponse.json({
      success: true,
      message: "Bank opening balance posted successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to post bank opening balance";

    console.error("Bank opening balance posting error:", error);

    if (
      message === "Opening balance record not found." ||
      message === "Opening balance record not found"
    ) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 },
      );
    }

    if (message === "Unauthorized" || message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 401 },
      );
    }

    const badRequestConditions = [
      "already been posted",
      "Only open",
      "must be greater than zero",
      "cannot have both",
      "not configured",
      "not found",
      "posting date",
      "Posting date",
      "Invalid opening balance",
      "local currency",
      "must be different",
      "not balanced",
      "Currency",
      "Exchange rate",
      "Debit",
      "Credit",
    ];

    if (badRequestConditions.some((condition) => message.includes(condition))) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
} */
