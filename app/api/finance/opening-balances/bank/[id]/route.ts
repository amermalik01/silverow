// app/api/finance/opening-balances/bank/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import { BankOpeningBalanceService } from "@/lib/services/finance/opening-balances/bank/bank-opening-balance.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getErrorStatus(message: string): number {
  if (
    message === "Opening balance record not found" ||
    message === "Bank account not found" ||
    message === "Customer not found" ||
    message === "Supplier not found" ||
    message === "Currency not found"
  ) {
    return 404;
  }

  if (message === "Unauthorized") return 401;

  if (
    message === "Invalid request body" ||
    message === "Invalid opening balance line" ||
    message === "Invalid document type" ||
    message === "Invalid party type" ||
    message === "Invalid posting date" ||
    message === "Bank account is required" ||
    message ===
      "bank_account_id and bank_gl_account_id must be the same account ID" ||
    message === "Party is required" ||
    message === "Posting date is required" ||
    message === "Currency is required" ||
    message === "Currency ID and currency code do not match" ||
    message.startsWith("Debit must") ||
    message.startsWith("Credit must") ||
    message.startsWith("Exchange rate must") ||
    message.startsWith("A line cannot") ||
    message.startsWith("Only open")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid record ID" },
        { status: 400 },
      );
    }

    const data = await BankOpeningBalanceService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Bank opening balance not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("Bank opening balance GET by ID error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load bank opening balance";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!id?.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid record ID" },
        { status: 400 },
      );
    }

    const body: unknown = await req.json();

    await client.query("BEGIN");
    transactionStarted = true;

    const data = await BankOpeningBalanceService.update(
      client,
      companyId,
      id,
      body,
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Bank opening balance updated successfully",
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
        : "Failed to update bank opening balance";

    console.error("Bank opening balance PUT error:", error);

    return NextResponse.json(
      { success: false, error: message },
      { status: getErrorStatus(message) },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid record ID" },
        { status: 400 },
      );
    }

    await BankOpeningBalanceService.delete(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Bank opening balance deleted successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete bank opening balance";

    console.error("Bank opening balance DELETE error:", error);

    return NextResponse.json(
      { success: false, error: message },
      { status: getErrorStatus(message) },
    );
  }
}
