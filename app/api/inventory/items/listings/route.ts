// app/api/inventory/items/listings/route.ts

import { NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { FetchParams } from "@/types/table";
import { ItemsService } from "@/lib/services/inventory/Items.service";

export async function POST(req: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { error: "Access Denied. Unauthorized Session Check." },
        { status: 401 },
      );
    }

    const params: FetchParams = await req.json();
    const result = await ItemsService.listPaginated(companyId, params);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Fetch Items Paginated Error: ", err);
    return NextResponse.json(
      { error: "Internal error fetching items listing." },
      { status: 500 },
    );
  }
}
