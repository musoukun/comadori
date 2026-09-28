import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// ログイン状態を、署名付きの cookie で持つ。所有者と相手（ゲスト）で cookie を分ける
const COOKIE_NAMES = { owner: "comadori_owner", guest: "comadori_guest" } as const;
type Kind = keyof typeof COOKIE_NAMES;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(value: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(value).digest("hex");
}

async function setSession(kind: Kind, id: string) {
  (await cookies()).set(COOKIE_NAMES[kind], `${id}.${sign(`${kind}:${id}`)}`, {
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

/** 署名が正しければ cookie に入っている ID を返す */
async function readSession(kind: Kind): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE_NAMES[kind])?.value;
  if (!raw) return null;
  const [id, signature] = raw.split(".");
  const expected = sign(`${kind}:${id}`);
  if (
    !signature ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  return id;
}

export const setOwnerSession = (ownerId: string) => setSession("owner", ownerId);
export const clearOwnerSession = () => clearSession("owner");
export const setGuestSession = (guestId: string) => setSession("guest", guestId);
export const clearGuestSession = () => clearSession("guest");

/** ログイン中の所有者を返す。未ログインなら null */
export async function getCurrentOwner() {
  const id = await readSession("owner");
  return id ? prisma.owner.findUnique({ where: { id } }) : null;
}

/** ログイン中の相手を返す。未ログインなら null */
export async function getCurrentGuest() {
  const id = await readSession("guest");
  return id ? prisma.guest.findUnique({ where: { id } }) : null;
}
