// app/api/purchase-receipts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseReceiptService } from "@/lib/services/purchase-receipts/purchase-receipt.service";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = await req.json();
    const data = await PurchaseReceiptService.create(companyId, body);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Create failed",
      },
      {
        status: 500,
      },
    );
  }
}
