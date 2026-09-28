import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { isAllowedOwner, upsertOwner } from "@/features/owner/owner";
import { exchangeCode } from "@/lib/google";
import { setOwnerSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expected = store.get("comadori_oauth_state")?.value;
  store.delete("comadori_oauth_state");

  if (!code || !state || state !== expected) {
    return new Response("ログインに失敗しました。もう一度お試しください。", { status: 400 });
  }

  const { email, refreshToken } = await exchangeCode(code);
  if (!isAllowedOwner(email)) {
    return new Response("このGoogleアカウントではログインできません。", { status: 403 });
  }
  const owner = await upsertOwner(email, refreshToken);
  await setOwnerSession(owner.id);
  redirect("/me");
}
