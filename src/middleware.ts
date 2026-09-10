import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/types";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* -------- i18n locale prefix -------- */
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const cookie = req.cookies.get("ra-locale")?.value;
    const locale = LOCALES.includes(cookie as never) ? cookie : DEFAULT_LOCALE;
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  /* -------- Protected routes -------- */
  // Extract locale and rest of path
  const segments = pathname.split("/").filter(Boolean); // ["fa", "artist"] etc.
  const rest = segments.slice(1).join("/"); // "artist" | "admin" | ...

  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(sessionToken);

  // /[locale]/artist — requires role: artist or admin
  if (rest === "artist" || rest.startsWith("artist/")) {
    if (!session || (session.role !== "artist" && session.role !== "admin")) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${segments[0]}/login`;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // /[locale]/admin — requires role: admin
  if (rest === "admin" || rest.startsWith("admin/")) {
    if (!session || session.role !== "admin") {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${segments[0]}/login`;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|fonts|images|favicon.ico|.*\\..*).*)"],
};
