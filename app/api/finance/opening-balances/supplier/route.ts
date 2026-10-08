// app/api/finance/opening-balances/supplier/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
// import { SupplierOpeningBalanceService } from "@/lib/services/finance/supplier-opening-balance.service";
import { CustomerSupplierOpeningBalanceService } from "@/lib/services/finance/opening-balances/customer-supplier-opening-balance.service";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);

    const partyId = searchParams.get("party_id") || undefined;

    const data = await CustomerSupplierOpeningBalanceService.list(
      companyId,
      "supplier",
      partyId,
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("Supplier opening balances GET error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load supplier opening balances";

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

export async function POST(req: NextRequest) {
  const client = await pool.connect();

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

    const body: unknown = await req.json();

    await client.query("BEGIN");

    const data = await CustomerSupplierOpeningBalanceService.create(
      client,
      companyId,
      "supplier",
      body,
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 201,
      },
    );
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    console.error("Supplier opening balances POST error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save supplier opening balances";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 400,
      },
    );
  } finally {
    client.release();
  }
}

/* export async function POST(req: NextRequest) {
  const client = await pool.connect();

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

    const body: unknown = await req.json();

    await client.query("BEGIN");

    const result = await SupplierOpeningBalanceService.create(
      client,
      companyId,
      body,
    );

    await client.query("COMMIT");

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 201,
      },
    );
  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Supplier opening balance create error:", err);

    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to create supplier opening balances";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
} */
