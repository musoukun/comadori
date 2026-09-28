import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// 所有者のログイン状態を、署名付きの cookie 1つで持つ
const COOKIE_NAME = "comadori_owner";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(value: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(value).digest("hex");
}

export async function setOwnerSession(ownerId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, `${ownerId}.${sign(ownerId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearOwnerSession() {
  (await cookies()).delete(COOKIE_NAME);
}

/** ログイン中の所有者を返す。未ログインなら null */
export async function getCurrentOwner() {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [ownerId, signature] = raw.split(".");
  const expected = sign(ownerId);
  if (
    !signature ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  return prisma.owner.findUnique({ where: { id: ownerId } });
}
