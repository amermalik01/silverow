// app/api/finance/opening-balances/bank/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import { BankOpeningBalanceService } from "@/lib/services/finance/opening-balances/bank/bank-opening-balance.service";

function getErrorStatus(message: string): number {
  if (message === "Unauthorized") return 401;

  if (
    message === "Bank account not found" ||
    message === "Customer not found" ||
    message === "Supplier not found" ||
    message === "Currency not found"
  ) {
    return 404;
  }

  if (
    message === "Invalid request body" ||
    message === "lines must be an array" ||
    message === "Invalid opening balance line" ||
    message === "Invalid document type" ||
    message === "Invalid party type" ||
    message === "Bank account is required" ||
    message ===
      "bank_account_id and bank_gl_account_id must be the same account ID" ||
    message === "Party is required" ||
    message === "Posting date is required" ||
    message === "Invalid posting date" ||
    message === "Currency is required" ||
    message === "Currency ID and currency code do not match" ||
    message.startsWith("Debit must") ||
    message.startsWith("Credit must") ||
    message.startsWith("Exchange rate must") ||
    message.startsWith("A line cannot")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const bankAccountId =
      searchParams.get("bank_account_id") ||
      searchParams.get("bank_gl_account_id") ||
      undefined;

    const partyId = searchParams.get("party_id") || undefined;

    const rawPartyType = searchParams.get("party_type");
    const rawStatus = searchParams.get("status");

    if (
      rawPartyType &&
      rawPartyType !== "customer" &&
      rawPartyType !== "supplier"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid party type" },
        { status: 400 },
      );
    }

    if (rawStatus && rawStatus !== "Open" && rawStatus !== "Posted") {
      return NextResponse.json(
        { success: false, error: "Invalid opening balance status" },
        { status: 400 },
      );
    }

    const data = await BankOpeningBalanceService.list(companyId, {
      bankAccountId,
      partyId,
      partyType: rawPartyType as "customer" | "supplier" | undefined,
      status: rawStatus as "Open" | "Posted" | undefined,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("Bank opening balances GET error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load bank opening balances";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

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

    await client.query("BEGIN");
    transactionStarted = true;

    const data = await BankOpeningBalanceService.create(
      client,
      companyId,
      body,
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json(
      {
        success: true,
        message: "Bank opening balances created successfully",
        data,
      },
      { status: 201 },
    );
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
        : "Failed to save bank opening balances";

    console.error("Bank opening balances POST error:", error);

    return NextResponse.json(
      { success: false, error: message },
      { status: getErrorStatus(message) },
    );
  } finally {
    client.release();
  }
}
