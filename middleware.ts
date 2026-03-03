// /middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get("host") || "";
  const host = hostname.split(":")[0];
  const parts = host.split(".");
  const subdomain = parts.length > 2 ? parts[0] : null;

  // localhost handling
  if (host.includes("localhost")) {
    if (subdomain === "admin") {
      url.pathname = `/admin${url.pathname}`;
    } else if (subdomain) {
      url.pathname = `/company/${subdomain}${url.pathname}`;
    }

    return NextResponse.rewrite(url);
  }

  // production
  if (subdomain === "admin") {
    url.pathname = `/admin${url.pathname}`;
  } else if (subdomain) {
    url.pathname = `/company/${subdomain}${url.pathname}`;
  }

  return NextResponse.rewrite(url);
}

// export function middleware(req: NextRequest) {
//   const host = req.headers.get("host") || "";
//   const url = req.nextUrl.clone();

//   const subdomain = host.split(".")[0];

//   console.log("subdomain ==== ", subdomain);

//   // Handle localhost
//   if (host.includes("localhost")) {
//     if (subdomain === "admin") {
//       url.pathname = `/admin${url.pathname}`;
//     } else if (subdomain !== "localhost") {
//       url.pathname = `/company${url.pathname}`;
//     }

//     console.log("host ==== ", host);
//     console.log("url ==== ", url.pathname);
//     return NextResponse.rewrite(url);
//   }

//   // Production
//   if (subdomain === "admin") {
//     url.pathname = `/admin${url.pathname}`;
//   } else {
//     url.pathname = `/company/${subdomain}${url.pathname}`;
//   }

//   return NextResponse.rewrite(url);
// }

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
};

// export function middleware(req: NextRequest) {
//   const host = req.headers.get("host") || "";
//   const url = req.nextUrl.clone();

//   const subdomain = host.split(".")[0];

//   // Skip localhost root
//   if (host.includes("localhost")) {
//     return NextResponse.next();
//   }

//   if (subdomain === "admin") {
//     url.pathname = `/admin${url.pathname}`;
//   } else {
//     url.pathname = `/company${url.pathname}`;
//   }

//   return NextResponse.rewrite(url);
// }
