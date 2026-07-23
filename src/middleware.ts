import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/health", "/api/seed"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow Next.js internals and static assets.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif)$/)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  // API routes: return JSON 401 instead of redirecting.
  if (pathname.startsWith("/api")) {
    if (PUBLIC_API_PATHS.some((p) => pathname === p)) {
      return NextResponse.next();
    }
    if (!session) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Login page: redirect away if already authenticated.
  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Every other page requires a session.
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
