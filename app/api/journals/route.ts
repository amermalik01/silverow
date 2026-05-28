// app/api/journals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { JournalService } from "@/lib/services/journal.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // const status = searchParams.get("status") || "";
    // const data = await JournalService.list(companyId, status);
    
    const status = searchParams.get("status") as "posted" | "unposted" | null;
    const source = searchParams.get("source") || undefined;
    const isPosted = searchParams.get("is_posted");

    const data = ""

    // const data = await JournalService.list(companyId, {
    //   status: status || undefined,
    //   source,
    //   is_posted:
    //     isPosted === "true" ? true : isPosted === "false" ? false : undefined,
    // });

    return NextResponse.json({
      data,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load journals",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const result = await JournalService.create(companyId, body);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create journal",
      },
      {
        status: 500,
      },
    );
  }
}
