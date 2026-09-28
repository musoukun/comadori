import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedOwner, upsertOwner } from "@/features/owner/owner";
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google";
import { setOwnerSession } from "@/lib/session";

export async function GET() {
  if (!isGoogleConfigured()) {
    // Google の設定が無い開発環境では、OWNER_EMAIL の所有者としてそのままログインする
    const email = process.env.OWNER_EMAIL;
    if (process.env.NODE_ENV === "production" || !email || !isAllowedOwner(email)) {
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
