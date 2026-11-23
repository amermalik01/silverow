// app/api/sales/crm/prospects/[id]/offers/_shared.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { ProspectOfferError } from "@/lib/services/sales/crm/prospect/prospect-offer.service";

export async function getOfferSession() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;
  const userId = session?.user?.id;

  return companyId && userId ? { companyId, userId } : null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
}

export function offerErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const first = error.issues[0];

    return NextResponse.json(
      {
        error: first?.message ?? "Validation failed.",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof ProspectOfferError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(`${fallback}:`, error);

  return NextResponse.json({ error: fallback }, { status: 500 });
}
