// app/api/finance/opening-balances/customer/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import { CustomerSupplierOpeningBalanceService } from "@/lib/services/finance/opening-balances/customer-supplier-opening-balance.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await params;

    const data = await CustomerSupplierOpeningBalanceService.get(
      companyId,
      "customer",
      id,
    );

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer opening balance not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("Customer opening balance GET by ID error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load customer opening balance";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      },
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

    const data = await CustomerSupplierOpeningBalanceService.update(
      client,
      companyId,
      id,
      "customer",
      body,
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      message: "Customer opening balance updated successfully",
      data,
    });
  } catch (error: unknown) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update customer opening balance";

    console.error("Customer opening balance update error:", error);

    const status =
      message === "Opening balance record not found" ||
      message === "Customer not found"
        ? 404
        : message === "Unauthorized"
          ? 401
          : message === "Invalid request body" ||
              message.startsWith("Update requires") ||
              message === "lines must be an array" ||
              message === "Invalid opening balance line" ||
              message === "Invalid document type" ||
              message === "Party is required" ||
              message === "Posting date is required" ||
              message === "Currency is required" ||
              message.startsWith("Debit must") ||
              message.startsWith("Credit must") ||
              message.startsWith("Exchange rate must") ||
              message.startsWith("A line cannot")
            ? 400
            : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  } finally {
    client.release();
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
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

    await CustomerSupplierOpeningBalanceService.delete(
      companyId,
      id,
      "customer",
    );

    return NextResponse.json({
      success: true,
      message: "Customer opening balance deleted successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete customer opening balance";

    console.error("Customer opening balance delete error:", error);

    const status = message === "Opening balance record not found" ? 404 : 500;

    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/* 
export async function PUT(
  req: NextRequest,
  { params }: RouteContext,
) {
  const client = await pool.connect();

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

    const data = await CustomerSupplierOpeningBalanceService.update(
      client,
      companyId,
      id,
      "customer",
      body,
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Customer opening balance updated successfully",
      data,
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update customer opening balance";

    console.error("Customer opening balance update error:", error);

    const status =
      message === "Opening balance record not found" ||
      message === "Customer not found"
        ? 404
        : message === "Unauthorized"
          ? 401
          : 400;

    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext,
) {
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

    await CustomerSupplierOpeningBalanceService.delete(
      companyId,
      id,
      "customer",
    );

    return NextResponse.json({
      success: true,
      message: "Customer opening balance deleted successfully",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete customer opening balance";

    console.error("Customer opening balance delete error:", error);

    return NextResponse.json(
      { success: false, error: message },
      {
        status: message === "Opening balance record not found" ? 404 : 500,
      },
    );
  }
} 
  */
