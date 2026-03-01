// /middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  const subdomain = host.split(".")[0];

  // Skip localhost root
  if (host.includes("localhost")) {
    return NextResponse.next();
  }

  if (subdomain === "admin") {
    url.pathname = `/admin${url.pathname}`;
  } else {
    url.pathname = `/company${url.pathname}`;
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};