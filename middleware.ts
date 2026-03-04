// /middleware.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const pathName = url.pathname;

  const isPublicRoute = 
    pathName === "/login" || 
    pathName === "/signup" || 
    pathName.startsWith("/api") || 
    pathName.startsWith("/_next") || 
    pathName.includes("."); // catches favicon.ico, images, etc.

  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Get subdomain (e.g., 'acme' from 'acme.localhost:3000')
  const currentHost = process.env.NODE_ENV === "production" 
    ? hostname.replace(`.crmsystem.com`, "") 
    : hostname.replace(`.localhost:3000`, "");

  const searchParams = url.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  // 1. Prevent infinite loops/double prefixing
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/company')) {
     return NextResponse.next();
  }

  // 2. Route Super Admin
  if (currentHost === "admin") {
    return NextResponse.rewrite(new URL(`/admin${path}`, req.url));
  }

  // 3. Route Company Subdomains
  if (currentHost && currentHost !== "www" && currentHost !== "localhost") {
    return NextResponse.rewrite(new URL(`/company/${currentHost}${path}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Matcher ignoring static files and specific folders
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

/*  export function middleware(req: NextRequest) {
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
 */


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
