// app/api/sales/crm/prospects/[id]/offers/route.ts

import { NextRequest, NextResponse } from "next/server";

import { ProspectOfferService } from "@/lib/services/sales/crm/prospect/prospect-offer.service";
import { getOfferSession, offerErrorResponse, unauthorized } from "./_shared";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** List all offers (with lines) plus defaults for a new offer. */
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const session = await getOfferSession();
    if (!session) return unauthorized();

    const { id } = await params;

    const result = await ProspectOfferService.list(session.companyId, id);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return offerErrorResponse(error, "Failed to load prospect offers.");
  }
}

/** Create a new offer. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const session = await getOfferSession();
    if (!session) return unauthorized();

    const { id } = await params;
    const body: unknown = await request.json();

    const offer = await ProspectOfferService.create(
      session.companyId,
      session.userId,
      id,
      body,
    );

    return NextResponse.json(
      { success: true, data: offer, message: "Offer created successfully." },
      { status: 201 },
    );
  } catch (error) {
    return offerErrorResponse(error, "Failed to create offer.");
  }
}
