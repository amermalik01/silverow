// app/api/sales/crm/prospects/[id]/offers/[offerId]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { ProspectOfferService } from "@/lib/services/sales/crm/prospect/prospect-offer.service";
import { getOfferSession, offerErrorResponse, unauthorized } from "../_shared";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; offerId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const session = await getOfferSession();
    if (!session) return unauthorized();

    const { id, offerId } = await params;

    const offer = await ProspectOfferService.getById(
      session.companyId,
      id,
      offerId,
    );

    if (!offer) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }

    return NextResponse.json({ data: offer });
  } catch (error) {
    return offerErrorResponse(error, "Failed to load offer.");
  }
}

/** Update header and replace all lines (DRAFT / SENT only). */
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const session = await getOfferSession();
    if (!session) return unauthorized();

    const { id, offerId } = await params;
    const body: unknown = await request.json();

    const offer = await ProspectOfferService.update(
      session.companyId,
      session.userId,
      id,
      offerId,
      body,
    );

    return NextResponse.json({
      success: true,
      data: offer,
      message: "Offer updated successfully.",
    });
  } catch (error) {
    return offerErrorResponse(error, "Failed to update offer.");
  }
}

/** Delete a DRAFT offer. */
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const session = await getOfferSession();
    if (!session) return unauthorized();

    const { id, offerId } = await params;

    await ProspectOfferService.delete(session.companyId, id, offerId);

    return NextResponse.json({
      success: true,
      message: "Offer deleted successfully.",
    });
  } catch (error) {
    return offerErrorResponse(error, "Failed to delete offer.");
  }
}
