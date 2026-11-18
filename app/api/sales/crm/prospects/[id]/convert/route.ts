// app/api/sales/crm/prospects/[id]/convert/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";

import { authOptions } from "@/lib/auth";
import { ProspectService } from "@/lib/services/sales/crm/prospect/prospect.service";
import { ProspectConversionSchema } from "@/lib/validations/prospect.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    const userId = session?.user?.id;

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: "Unauthorized access." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body: unknown = await request.json();

    const payload = ProspectConversionSchema.parse(body);

    const result = await ProspectService.convertToCustomer(
      companyId,
      userId,
      id,
      payload,
    );

    return NextResponse.json({
      success: true,
      prospect: result.prospect,
      customer: result.customer,
      message: "Prospect converted into customer successfully.",
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid conversion details.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Prospect Conversion API Error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to convert prospect into customer.";

    const status =
      message === "Prospect not found."
        ? 404
        : message === "Prospect has already been converted."
          ? 409
          : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
