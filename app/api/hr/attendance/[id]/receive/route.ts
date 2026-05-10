// app/api/purchase-orders/[id]/receive/route.ts

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: true,
    message:
      "Receive logic will be implemented next",
  });
}