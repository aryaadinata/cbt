import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Lewati static assets, API proxy, favicon, dan halaman login
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname === "/login" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Jika ada parameter token SSO di URL, izinkan lewat agar AuthContext memprosesnya
  if (
    searchParams.has("token") ||
    searchParams.has("sso_token") ||
    searchParams.has("jwt")
  ) {
    return NextResponse.next();
  }

  // Cek apakah ada cookie token CBT murni (Opsi A: Sesi Mandiri Terpisah dari SIAK)
  const cbtToken = request.cookies.get("cbt_token")?.value;

  // HANYA redirect jika root path '/' dan TIDAK ada token
  if (pathname === "/" && !cbtToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login dan membuka /login, alihkan ke /
  if (pathname === "/login" && cbtToken) {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
