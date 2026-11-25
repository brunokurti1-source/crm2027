import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALE_COOKIE = "crm2027_locale";
const ALLOWED = new Set(["en", "es", "it", "de"]);

export function middleware(request: NextRequest) {
  const raw = request.cookies.get(LOCALE_COOKIE)?.value;
  if (raw && !ALLOWED.has(raw)) {
    const res = NextResponse.next();
    res.cookies.set(LOCALE_COOKIE, "en", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
