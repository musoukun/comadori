// ログインの cookie の名前と設定。DB に依存しないので、Proxy からも使える

export const COOKIE_NAMES = { owner: "comadori_owner", guest: "comadori_guest" } as const;

/** ログインを保つ期間。ページを開くたびに、ここから数え直す */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
