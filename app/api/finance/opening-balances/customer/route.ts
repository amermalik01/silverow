// app/api/finance/opening-balances/customer/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
// import { CustomerOpeningBalanceService } from "@/lib/services/finance/customer-opening-balance.service";

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
      "customer",
      partyId,
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("Customer opening balances GET error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load customer opening balances";

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
      "customer",
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

    console.error("Customer opening balances POST error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save customer opening balances";

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

    const result = await CustomerOpeningBalanceService.create(
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

    console.error("Customer opening balance create error:", err);

    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to create customer opening balances";

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
}
 */