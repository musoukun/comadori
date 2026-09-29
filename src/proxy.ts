import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAMES, sessionCookieOptions } from "@/lib/sessionCookie";

/**
 * ページを開くたびに、ログインの cookie の期限を延ばす（しばらく使っていればログインしたままになる）。
 * 値はそのまま付け直すだけで、正しいかどうかはページ側（lib/session.ts）で確かめる
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  for (const name of Object.values(COOKIE_NAMES)) {
    const value = request.cookies.get(name)?.value;
    if (value) response.cookies.set(name, value, sessionCookieOptions());
  }
  return response;
}

// 数秒おきに呼ばれる API は対象にせず、画面を開いたときだけ延ばす
export const config = {
  matcher: ["/me/:path*", "/b/:path*"],
};
