import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Protect the /dashboard route
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const hasAuth =
      req.cookies.has("sb-access-token") || req.cookies.has("sb-refresh-token");

    if (!hasAuth) {
      const url = req.nextUrl.clone();
      url.pathname = "/signin";
      // Add a redirect parameter
      url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
