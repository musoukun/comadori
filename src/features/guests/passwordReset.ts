import { createHash, randomBytes } from "node:crypto";
import { GUESTS } from "@/config/guests";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { hashPassword } from "@/lib/password";
import { GuestError, normalizeEmail, throttleKey } from "./guests";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * 再設定メールを送る。登録の有無は呼び出し元に返さない（画面には同じ文言を出す）。
 * 同じ人に続けて送らないよう、直近に発行済みなら何もしない
 */
export async function sendPasswordResetMail(owner: { id: string; slug: string }, email: string, now = new Date()) {
  const guest = await prisma.guest.findUnique({
    where: { ownerId_email: { ownerId: owner.id, email: normalizeEmail(email) } },
  });
  if (!guest) return;

  const recent = await prisma.passwordResetToken.findFirst({
    where: {
      guestId: guest.id,
      createdAt: { gt: new Date(now.getTime() - GUESTS.resetRequestIntervalSeconds * 1000) },
    },
  });
  if (recent) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      guestId: guest.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + GUESTS.resetTokenMinutes * 60_000),
    },
  });

  // URL は Host ヘッダーではなく設定値から作る
  const url = `${process.env.APP_URL}/b/${owner.slug}/reset?token=${token}`;
  await sendMail({
    to: guest.email,
    subject: "【コマドリ】パスワードの再設定",
    text: [
      `${guest.name} さん`,
      "",
      "パスワードの再設定を受け付けました。下のリンクから新しいパスワードを設定してください。",
      url,
      "",
      `リンクの有効期限は${GUESTS.resetTokenMinutes}分で、1回だけ使えます。`,
      "心当たりが無い場合は、このメールを無視してください。",
    ].join("\n"),
  });
}

/** リンクのトークンが今使えるものか */
export async function isUsableResetToken(token: string, now = new Date()): Promise<boolean> {
  const found = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return Boolean(found && !found.usedAt && found.expiresAt > now);
}

/**
 * 新しいパスワードにする。トークンは使用済みにし、同じ人の他のトークンも消す。
 * パスワードが変わるので、それまでのログイン状態は使えなくなる（session.ts の印）
 */
export async function resetPassword(token: string, newPassword: string, now = new Date()) {
  if (newPassword.length < GUESTS.passwordMinLength) {
    throw new GuestError(`パスワードは${GUESTS.passwordMinLength}文字以上にしてください。`);
  }
  const passwordHash = await hashPassword(newPassword);

  const guest = await prisma.$transaction(async (tx) => {
    const used = await tx.passwordResetToken.updateMany({
      where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (used.count === 0) {
      throw new GuestError("このリンクは使えません。もう一度、再設定のメールを送ってください。");
    }
    const { guestId } = await tx.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    await tx.passwordResetToken.deleteMany({ where: { guestId, usedAt: null } });
    return tx.guest.update({ where: { id: guestId }, data: { passwordHash } });
  });

  await prisma.loginThrottle.deleteMany({ where: { key: throttleKey(guest.ownerId, guest.email) } });
  await sendMail({
    to: guest.email,
    subject: "【コマドリ】パスワードを変更しました",
    text: [
      `${guest.name} さん`,
      "",
      "コマドリのパスワードを変更しました。",
      "心当たりが無い場合は、予約ページの持ち主に連絡してください。",
    ].join("\n"),
  });
}
