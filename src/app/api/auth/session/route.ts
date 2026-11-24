import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;
    const response = NextResponse.json({ success: true });
    response.headers.set("Cache-Control", "no-store");

    if (token) {
      // Set cookie dari header HTTP server (paling kompatibel untuk semua HP / mobile browser)
      response.cookies.set("cbt_token", token, {
        path: "/",
        maxAge: 86400 * 7, // 7 hari
        httpOnly: false,
        sameSite: "lax",
      });
    } else {
      response.cookies.set("cbt_token", "", {
        path: "/",
        maxAge: 0,
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
