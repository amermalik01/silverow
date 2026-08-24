// app/api/hr/attendance/[id]/post/route.ts


import { NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";

export async function POST(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await PurchaseOrderService.post(companyId, id);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to post purchase order",
      },
      {
        status: 500,
      },
    );
  }
}
