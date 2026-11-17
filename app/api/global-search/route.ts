// app/api/global-search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { GlobalSearchService } from "@/lib/services/global-search/global-search.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_LENGTH = 100;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

interface GlobalSearchApiResponse {
  success: boolean;
  results?: Awaited<ReturnType<typeof GlobalSearchService.search>>;
  total?: number;
  message?: string;
}

function getValidatedLimit(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return DEFAULT_LIMIT;
  }

  const parsedValue = Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > MAX_LIMIT
  ) {
    return null;
  }

  return parsedValue;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<GlobalSearchApiResponse>> {
  try {
    // ---------------------------------------------------------
    // 1. Authenticate user
    // ---------------------------------------------------------
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please sign in.",
        },
        { status: 401 },
      );
    }

    // ---------------------------------------------------------
    // 2. Get company from authenticated session
    // ---------------------------------------------------------
    const companyId = session.user.company_id;

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: "No company is associated with this user session.",
        },
        { status: 403 },
      );
    }

    // ---------------------------------------------------------
    // 3. Read and validate query parameters
    // ---------------------------------------------------------
    const searchParams = request.nextUrl.searchParams;

    const searchTerm = (searchParams.get("q") ?? "")
      .trim()
      .replace(/\s+/g, " ");

    if (searchTerm.length < MIN_SEARCH_LENGTH) {
      return NextResponse.json({
        success: true,
        results: [],
        total: 0,
      });
    }

    if (searchTerm.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Search term cannot exceed ${MAX_SEARCH_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    const limit = getValidatedLimit(searchParams.get("limit"));

    if (limit === null) {
      return NextResponse.json(
        {
          success: false,
          message: `Limit must be a number between 1 and ${MAX_LIMIT}.`,
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------------
    // 4. Execute global search
    // ---------------------------------------------------------
    const results = await GlobalSearchService.search(
      companyId,
      searchTerm,
      limit,
    );

    // ---------------------------------------------------------
    // 5. Return results
    // ---------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        results,
        total: results.length,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error: unknown) {
    console.error("[GLOBAL_SEARCH_API_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to perform global search. Please try again.",
      },
      { status: 500 },
    );
  }
}
