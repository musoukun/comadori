// Google OAuth と FreeBusy API の呼び出し。応答はアプリ内の形（Interval）に変換して返す
import type { Interval } from "@/lib/time";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";
const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.freebusy"];

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  return `${process.env.APP_URL}/api/auth/google/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

async function postToken(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Google token error: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; id_token?: string }>;
}

/** 認可コードをトークンに換え、ログインした人のメールアドレスも取り出す */
export async function exchangeCode(code: string) {
  const token = await postToken({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
  });
  // id_token は Google のトークン窓口から TLS で直接受け取ったものなので、中身を読むだけでよい
  const payload = JSON.parse(
    Buffer.from(token.id_token!.split(".")[1], "base64url").toString("utf8"),
  ) as { email: string; email_verified?: boolean };
  return { email: payload.email, refreshToken: token.refresh_token };
}

/** 指定期間の「埋まっている時間帯」だけを返す。予定の中身は受け取らない */
export async function fetchBusy(
  refreshToken: string | null,
  from: Date,
  to: Date,
): Promise<Interval[]> {
  if (!refreshToken || !isGoogleConfigured()) return [];
  const { access_token } = await postToken({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(FREEBUSY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      items: [{ id: "primary" }],
    }),
  });
  if (!res.ok) throw new Error(`Google freeBusy error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    calendars: Record<string, { busy?: { start: string; end: string }[] }>;
  };
  return (data.calendars.primary?.busy ?? []).map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));
}
