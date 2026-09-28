import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isAllowedOwner, upsertOwner } from "@/features/owner/owner";
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google";
import { setOwnerSession } from "@/lib/session";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    // Google の設定が無い開発環境では、OWNER_EMAIL の所有者としてそのままログインする。
    // 外から届く URL（トンネルなど）では使えないよう、自分の PC からのアクセスに限る
    const email = process.env.OWNER_EMAIL;
    const isLocal = LOCAL_HOSTS.includes(request.nextUrl.hostname);
    if (process.env.NODE_ENV === "production" || !isLocal || !email || !isAllowedOwner(email)) {
      return new Response("Google OAuth が設定されていません。", { status: 500 });
    }
    const owner = await upsertOwner(email);
    await setOwnerSession(owner.id);
    redirect("/me");
  }

  const state = randomBytes(16).toString("hex");
  (await cookies()).set("comadori_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  redirect(buildAuthUrl(state));
}
