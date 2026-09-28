"use server";

import { BookingError, confirmHold, holdSlot, releaseHold, type GuestInput } from "@/features/booking/booking";

type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "エラーが発生しました。時間をおいてお試しください。" };
  }
}

export async function holdSlotAction(slug: string, startIso: string) {
  return run(() => holdSlot(slug, new Date(startIso)));
}

export async function confirmHoldAction(id: string, token: string, input: GuestInput) {
  return run(() => confirmHold(id, token, input));
}

export async function releaseHoldAction(id: string, token: string) {
  return run(async () => {
    await releaseHold(id, token);
    return {};
  });
}
