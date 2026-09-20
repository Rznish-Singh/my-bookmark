import { NextResponse, type NextRequest } from "next/server";

/** Cheap gate: bounce visitors without a session cookie. Real verification happens server-side in the layout and API. */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("bv_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
