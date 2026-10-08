// app/api/finance/opening-balances/supplier/[id]/route.ts

import { NextResponse } from "next/server";

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
      "supplier",
      id,
    );

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Supplier opening balance not found",
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
    console.error("Supplier opening balance GET by ID error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load supplier opening balance";

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
