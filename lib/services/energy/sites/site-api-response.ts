// lib/services/energy/sites/site-api-response.ts

import { NextResponse } from "next/server";
import { z } from "zod";
import { SiteServiceError } from "./sites.service";

interface PostgresError {
  code?: string;
  constraint?: string;
  detail?: string;
}

function isPostgresError(error: unknown): error is PostgresError {
  return typeof error === "object" && error !== null && "code" in error;
}

export function siteApiError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    const errors: Record<string, string> = {};

    for (const issue of error.issues) {
      const path = issue.path.map(String).join(".");
      const key = path || "global";

      if (!errors[key]) {
        errors[key] = issue.message;
      }

      // The UI uses top-level field paths without "site.".
      if (key.startsWith("site.")) {
        errors[key.slice(5)] = issue.message;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Please correct the validation errors.",
        errors,
      },
      { status: 400 },
    );
  }

  if (error instanceof SiteServiceError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode },
    );
  }

  if (isPostgresError(error)) {
    if (error.code === "23505") {
      const message =
        error.constraint === "energy_sites_company_site_no_active_uq"
          ? "Site number already exists for this company."
          : error.constraint?.includes("mpan")
            ? "MPAN already exists."
            : error.constraint?.includes("serial")
              ? "BESS serial number already exists."
              : "A duplicate record already exists.";

      return NextResponse.json(
        { success: false, error: message },
        { status: 409 },
      );
    }

    if (error.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          error: "The operation conflicts with a related record.",
        },
        { status: 409 },
      );
    }

    if (error.code === "23514") {
      return NextResponse.json(
        {
          success: false,
          error: "A database validation constraint was violated.",
        },
        { status: 400 },
      );
    }

    if (error.code === "22P02") {
      return NextResponse.json(
        { success: false, error: "Invalid identifier or data format." },
        { status: 400 },
      );
    }
  }

  console.error("Energy site API error:", error);

  return NextResponse.json(
    { success: false, error: "Internal server error." },
    { status: 500 },
  );
}
