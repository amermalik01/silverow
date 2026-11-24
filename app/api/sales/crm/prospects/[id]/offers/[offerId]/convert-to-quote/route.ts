// app/api/sales/crm/prospects/[id]/offers/[offerId]/convert-to-quote/route.ts

import { NextRequest, NextResponse } from "next/server";

import { ProspectOfferService } from "@/lib/services/sales/crm/prospect/prospect-offer.service";
import {
  getOfferSession,
  offerErrorResponse,
  unauthorized,
} from "../../_shared";

type Context = { params: Promise<{ id: string; offerId: string }> };

/** Convert an offer into a draft sales quote for the prospect. */
export async function POST(_request: NextRequest, { params }: Context) {
  try {
    const session = await getOfferSession();
    if (!session) return unauthorized();

    const { id, offerId } = await params;

    const result = await ProspectOfferService.convertToSalesQuote(
      session.companyId,
      session.userId,
      id,
      offerId,
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Sales quote ${result.quoteNo} created.`,
      },
      { status: 201 },
    );
  } catch (error) {
    return offerErrorResponse(error, "Failed to convert offer to a sales quote.");
  }
}
