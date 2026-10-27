// app/api/energy/site/[id]/status/route.ts

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCompanyId } from "@/lib/auth/getCompanyId";
import { EnergySiteService } from "@/lib/services/energy/sites/sites.service";
import { siteApiError } from "@/lib/services/energy/sites/site-api-response";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const StatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export async function PATCH(request: Request, context: RouteContext) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const siteId = z.string().uuid().parse(id);

    const body: unknown = await request.json();
    const { status } = StatusSchema.parse(body);

    const nextStatus: 0 | 1 = status === "active" ? 1 : 0;

    const result = await EnergySiteService.updateStatus(
      companyId,
      siteId,
      nextStatus,
    );

    return NextResponse.json({
      success: true,
      message:
        nextStatus === 1
          ? "Site activated successfully."
          : "Site deactivated successfully.",
      site: result,
    });
  } catch (error: unknown) {
    return siteApiError(error);
  }
}
