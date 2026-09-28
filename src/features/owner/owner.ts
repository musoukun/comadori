import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/** ログインを許可するメールアドレスか。OWNER_EMAIL が空なら誰でも可 */
export function isAllowedOwner(email: string): boolean {
  const allowed = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return !allowed || allowed === email.toLowerCase();
}

/** ログインした所有者を登録または更新する。共有リンクの識別子は初回だけ作る。Google の許可は新しく受け取ったときだけ上書きする */
export async function upsertOwner(email: string, google?: { refreshToken?: string; scopes?: string }) {
  const googleData = google?.refreshToken
    ? { googleRefreshToken: google.refreshToken, googleScopes: google.scopes ?? null }
    : {};
  return prisma.owner.upsert({
    where: { email },
    create: { email, slug: randomBytes(6).toString("base64url"), ...googleData },
    update: googleData,
  });
}
