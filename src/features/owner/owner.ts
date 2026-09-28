import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

/** ログインを許可するメールアドレスか。OWNER_EMAIL が空なら誰でも可 */
export function isAllowedOwner(email: string): boolean {
  const allowed = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return !allowed || allowed === email.toLowerCase();
}

/** ログインした所有者を登録または更新する。公開リンクの識別子は初回だけ作る */
export async function upsertOwner(email: string, refreshToken?: string) {
  return prisma.owner.upsert({
    where: { email },
    create: { email, slug: randomBytes(6).toString("base64url"), googleRefreshToken: refreshToken },
    update: refreshToken ? { googleRefreshToken: refreshToken } : {},
  });
}
