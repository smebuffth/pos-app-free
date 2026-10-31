import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Optimistic redirects only: the cookie is checked for presence here. Pages and actions verify the session
// themselves (lib/auth/guards.ts), so this file is never the security boundary.
const SETUP_OR_LOGIN = ["/login", "/setup"];
const OPEN_PREFIXES = ["/r/", "/api/", "/offline"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (SETUP_OR_LOGIN.includes(pathname)) {
    return hasSession ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  // The landing page: app/page.tsx sends a signed-in visitor on to their start page.
  if (pathname === "/") return NextResponse.next();
  if (OPEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();
  if (!hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Static files and the service worker are served as they are.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|logo/|art/|banners/|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|webp|svg|jpg|ico)$).*)"],
};
