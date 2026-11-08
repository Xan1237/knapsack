import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (process.env.WAITLIST_ONLY !== "true") return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.redirect(new URL("/#waitlist", request.url));
}

export const config = {
  matcher: [
    "/pack/:path*",
    "/api/analyze",
    "/api/astra/:path*",
    "/api/packing/:path*",
  ],
};
