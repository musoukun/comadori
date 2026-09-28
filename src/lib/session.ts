import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// ログイン状態を、署名付きの cookie で持つ。所有者と相手（ゲスト）で cookie を分ける
const COOKIE_NAMES = { owner: "comadori_owner", guest: "comadori_guest" } as const;
type Kind = keyof typeof COOKIE_NAMES;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * 署名には「印」も混ぜる。相手の印はパスワードのハッシュから作るので、
 * パスワードを変えるとそれまでの cookie は使えなくなる
 */
function sign(kind: Kind, id: string, stamp: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(`${kind}:${id}:${stamp}`).digest("hex");
}

const guestStamp = (passwordHash: string) => passwordHash.slice(-16);

async function setSession(kind: Kind, id: string, stamp: string) {
  (await cookies()).set(COOKIE_NAMES[kind], `${id}.${sign(kind, id, stamp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

async function clearSession(kind: Kind) {
  (await cookies()).delete(COOKIE_NAMES[kind]);
}

async function readCookie(kind: Kind) {
  const raw = (await cookies()).get(COOKIE_NAMES[kind])?.value;
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  return id && signature ? { id, signature } : null;
}

function isValidSignature(signature: string, expected: string): boolean {
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export const setOwnerSession = (ownerId: string) => setSession("owner", ownerId, "");
export const clearOwnerSession = () => clearSession("owner");
export const setGuestSession = (guest: { id: string; passwordHash: string }) =>
  setSession("guest", guest.id, guestStamp(guest.passwordHash));
export const clearGuestSession = () => clearSession("guest");

/** ログイン中の所有者を返す。未ログインなら null */
export async function getCurrentOwner() {
  const cookie = await readCookie("owner");
  if (!cookie || !isValidSignature(cookie.signature, sign("owner", cookie.id, ""))) return null;
  return prisma.owner.findUnique({ where: { id: cookie.id } });
}

/** ログイン中の相手を返す。未ログイン、またはパスワード変更前の cookie なら null */
export async function getCurrentGuest() {
  const cookie = await readCookie("guest");
  if (!cookie) return null;
  const guest = await prisma.guest.findUnique({ where: { id: cookie.id } });
  if (!guest) return null;
  return isValidSignature(cookie.signature, sign("guest", guest.id, guestStamp(guest.passwordHash))) ? guest : null;
}
