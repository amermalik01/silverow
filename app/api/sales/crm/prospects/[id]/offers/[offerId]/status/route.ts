// app/api/sales/crm/prospects/[id]/offers/[offerId]/status/route.ts

import { NextRequest, NextResponse } from "next/server";

import { ProspectOfferService } from "@/lib/services/sales/crm/prospect/prospect-offer.service";
import {
  getOfferSession,
  offerErrorResponse,
  unauthorized,
} from "../../_shared";

type Context = { params: Promise<{ id: string; offerId: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const session = await getOfferSession();
    if (!session) return unauthorized();

    const { id, offerId } = await params;
    const body: unknown = await request.json();

    const offer = await ProspectOfferService.setStatus(
      session.companyId,
      session.userId,
      id,
      offerId,
      body,
    );

    return NextResponse.json({
      success: true,
      data: offer,
      message: "Offer status updated.",
    });
  } catch (error) {
    return offerErrorResponse(error, "Failed to update offer.");
  }
}
