import { isValidColorId } from "@/config/colors";
import { GUESTS } from "@/config/guests";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export class GuestError extends Error {}

export type RegisterInput = { name: string; email: string; password: string; colorId: string };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function checkText(value: string, label: string): string {
  const text = value.trim();
  if (!text) throw new GuestError(`${label}を入力してください。`);
  if (text.length > GUESTS.maxTextLength) {
    throw new GuestError(`${label}は${GUESTS.maxTextLength}文字以内で入力してください。`);
  }
  return text;
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export function findOwnerBySlug(slug: string) {
  return prisma.owner.findUnique({ where: { slug } });
}

/** ほかの相手がもう使っている色 */
export async function takenColorIds(ownerId: string, exceptGuestId?: string): Promise<string[]> {
  const guests = await prisma.guest.findMany({
    where: { ownerId, NOT: exceptGuestId ? { id: exceptGuestId } : undefined },
    select: { colorId: true },
  });
  return guests.map((g) => g.colorId);
}

/** 共有リンクから相手が自分でアカウントを作る */
export async function registerGuest(ownerId: string, input: RegisterInput) {
  const name = checkText(input.name, "お名前");
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new GuestError("メールアドレスが正しくありません。");
  if (input.password.length < GUESTS.passwordMinLength) {
    throw new GuestError(`パスワードは${GUESTS.passwordMinLength}文字以上にしてください。`);
  }
  if (!isValidColorId(input.colorId)) throw new GuestError("色を選んでください。");

  const exists = await prisma.guest.findUnique({ where: { ownerId_email: { ownerId, email } } });
  if (exists) throw new GuestError("このメールアドレスは登録済みです。ログインしてください。");
  if ((await takenColorIds(ownerId)).includes(input.colorId)) {
    throw new GuestError("その色は他の方が使っています。別の色を選んでください。");
  }

  try {
    return await prisma.guest.create({
      data: {
        ownerId,
        name,
        email,
        passwordHash: await hashPassword(input.password),
        colorId: input.colorId,
        maskTitle: GUESTS.defaultMaskTitle,
      },
    });
  } catch (e) {
    // 確認と登録のあいだに、同じ色かメールアドレスが先に登録された
    if (isUniqueViolation(e)) {
      throw new GuestError("その色かメールアドレスは使われています。もう一度お試しください。");
    }
    throw e;
  }
}

export async function authenticateGuest(ownerId: string, email: string, password: string) {
  const guest = await prisma.guest.findUnique({
    where: { ownerId_email: { ownerId, email: normalizeEmail(email) } },
  });
  if (!guest || !(await verifyPassword(password, guest.passwordHash))) {
    throw new GuestError("メールアドレスかパスワードが違います。");
  }
  return guest;
}

/** 相手が自分の色を変える。ほかの相手が使っている色は選べない */
export async function changeGuestColor(guestId: string, colorId: string) {
  if (!isValidColorId(colorId)) throw new GuestError("色を選んでください。");
  try {
    await prisma.guest.update({ where: { id: guestId }, data: { colorId } });
  } catch (e) {
    if (isUniqueViolation(e)) throw new GuestError("その色は他の方が使っています。別の色を選んでください。");
    throw e;
  }
}

export function listGuests(ownerId: string) {
  return prisma.guest.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, colorId: true, maskTitle: true },
  });
}

/** 所有者が、その相手の予約をカレンダーに出すときの予定名を決める */
export async function updateMaskTitle(ownerId: string, guestId: string, maskTitle: string) {
  const title = checkText(maskTitle, "予定名");
  await prisma.guest.updateMany({ where: { id: guestId, ownerId }, data: { maskTitle: title } });
}

export async function deleteGuest(ownerId: string, guestId: string) {
  await prisma.guest.deleteMany({ where: { id: guestId, ownerId } });
}
