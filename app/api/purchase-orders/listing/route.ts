// app/api/purchase-orders/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";
import { FetchParams } from "@/types/table";

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const params: FetchParams = await req.json();
    const result = await PurchaseOrderService.listPaginated(companyId, params);

    return NextResponse.json({
      data: result.data,
      totalRecords: result.totalRecords,
    });
  } catch (err) {
    console.error("Purchase order list error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load purchase orders" },
      { status: 500 },
    );
  }
}
