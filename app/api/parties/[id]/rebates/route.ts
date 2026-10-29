// app/api/parties/[id]/rebates/route.ts

import { NextResponse } from "next/server";
import { actor, apiError } from "@/app/api/rebates/_shared";

import {
  RebateService,
  RebateError,
} from "@/lib/services/rebates/rebate.service";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Context) {
  try {
    const { companyId } = await actor();
    const { id } = await params;
    const type = new URL(req.url).searchParams.get("rebate_type");
    if (type !== "SALES" && type !== "PURCHASE")
      throw new RebateError("rebate_type must be SALES or PURCHASE");
    return NextResponse.json({
      data: await RebateService.list(companyId, id, type),
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request, { params }: Context) {
  try {
    const { companyId, userId } = await actor();
    const { id } = await params;
    return NextResponse.json(
      {
        data: await RebateService.create(
          companyId,
          id,
          await req.json(),
          userId,
        ),
      },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
