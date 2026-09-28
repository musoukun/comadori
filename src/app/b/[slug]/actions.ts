"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  BookingError,
  cancelBooking,
  confirmHold,
  holdSlot,
  releaseHold,
  type ConfirmInput,
} from "@/features/booking/booking";
import {
  authenticateGuest,
  changeGuestColor,
  findOwnerBySlug,
  GuestError,
  registerGuest,
  type RegisterInput,
} from "@/features/guests/guests";
import { resetPassword, sendPasswordResetMail } from "@/features/guests/passwordReset";
import { clearGuestSession, getCurrentGuest, setGuestSession } from "@/lib/session";

type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof BookingError || e instanceof GuestError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "エラーが発生しました。時間をおいてお試しください。" };
  }
}

async function requireOwner(slug: string) {
  const owner = await findOwnerBySlug(slug);
  if (!owner) throw new GuestError("予約ページが見つかりません。");
  return owner;
}

/** このリンクの所有者に登録済みの、ログイン中の相手 */
async function requireGuest(slug: string) {
  const owner = await requireOwner(slug);
  const guest = await getCurrentGuest();
  if (!guest || guest.ownerId !== owner.id) throw new GuestError("ログインしてください。");
  return guest;
}

export async function registerAction(slug: string, input: RegisterInput) {
  return run(async () => {
    const owner = await requireOwner(slug);
    const guest = await registerGuest(owner.id, input);
    await setGuestSession(guest);
    revalidatePath(`/b/${slug}`);
    return {};
  });
}

export async function loginAction(slug: string, email: string, password: string) {
  return run(async () => {
    const owner = await requireOwner(slug);
    const guest = await authenticateGuest(owner.id, email, password);
    await setGuestSession(guest);
    revalidatePath(`/b/${slug}`);
    return {};
  });
}

export async function guestLogoutAction(slug: string) {
  await clearGuestSession();
  revalidatePath(`/b/${slug}`);
}

export async function changeColorAction(slug: string, colorId: string) {
  return run(async () => {
    const guest = await requireGuest(slug);
    await changeGuestColor(guest.id, colorId);
    revalidatePath(`/b/${slug}`);
    return {};
  });
}

export async function holdSlotAction(slug: string, startIso: string, minutes: number) {
  return run(async () => holdSlot(await requireGuest(slug), new Date(startIso), minutes));
}

export async function confirmHoldAction(slug: string, bookingId: string, input: ConfirmInput) {
  return run(async () => confirmHold(await requireGuest(slug), bookingId, input));
}

export async function releaseHoldAction(slug: string, bookingId: string) {
  return run(async () => {
    await releaseHold(await requireGuest(slug), bookingId);
    return {};
  });
}

export async function cancelBookingAction(slug: string, bookingId: string) {
  return run(async () => {
    await cancelBooking(await requireGuest(slug), bookingId);
    return {};
  });
}

/** 再設定メールは応答を返したあとに送る。登録の有無で応答の中身も時間も変えない */
export async function requestPasswordResetAction(slug: string, email: string) {
  return run(async () => {
    const owner = await requireOwner(slug);
    after(() => sendPasswordResetMail(owner, email).catch((e) => console.error("[reset] failed", e)));
    return {};
  });
}

export async function resetPasswordAction(slug: string, token: string, password: string) {
  return run(async () => {
    await requireOwner(slug);
    await resetPassword(token, password);
    return {};
  });
}
