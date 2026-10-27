// app/api/energy/site/route.ts

import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { EnergySitePayloadSchema } from "@/lib/validations/energy-site.schema";
import { EnergySiteService } from "@/lib/services/energy/sites/sites.service";
import { siteApiError } from "@/lib/services/energy/sites/site-api-response";

export async function POST(request: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body: unknown = await request.json();
    const payload = EnergySitePayloadSchema.parse(body);

    const result = await EnergySiteService.create(companyId, payload);

    return NextResponse.json(
      {
        success: true,
        message: "Energy site created successfully.",
        id: result.id,
        site: result,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return siteApiError(error);
  }
}
