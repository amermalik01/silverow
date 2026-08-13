// app/api/parties/listing/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import {
  PartyService,
  PartyRecord,
} from "@/lib/services/parties/party.service";
import { FetchParams, FetchResponse } from "@/types/table";

interface ListingRequestBody extends FetchParams {
  role: string;
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as ListingRequestBody;
    const { role, ...params } = body;

    const result: FetchResponse<PartyRecord> = await PartyService.listPaginated(
      companyId,
      role,
      params,
    );

    return NextResponse.json({
      data: result.data,
      totalRecords: result.totalRecords,
    });
  } catch (err) {
    console.error("Party listing error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load directory records" },
      { status: 500 },
    );
  }
}
