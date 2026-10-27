// app/api/energy/site/[id]/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { EnergySitePayloadSchema } from "@/lib/validations/energy-site.schema";
import { EnergySiteService } from "@/lib/services/energy/sites/sites.service";
import { siteApiError } from "@/lib/services/energy/sites/site-api-response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function resolveId(context: RouteContext): Promise<string> {
  const { id } = await context.params;
  return z.string().uuid().parse(id);
}

export async function GET(_request: Request, context: RouteContext) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = await resolveId(context);
    const result = await EnergySiteService.get(companyId, id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return siteApiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = await resolveId(context);
    const body: unknown = await request.json();

    const payload = EnergySitePayloadSchema.parse(body);
    const result = await EnergySiteService.update(companyId, id, payload);

    return NextResponse.json({
      success: true,
      message: "Site updated successfully.",
      id: result.id,
      site: result,
    });
  } catch (error: unknown) {
    return siteApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = await resolveId(context);
    const result = await EnergySiteService.delete(companyId, id);

    return NextResponse.json({
      success: true,
      message: "Site deleted successfully.",
      id: result.id,
    });
  } catch (error: unknown) {
    return siteApiError(error);
  }
}
