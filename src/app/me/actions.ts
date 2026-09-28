"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addBlock, removeBlock } from "@/features/availability/blocks";
import { deleteGuest, GuestError, updateMaskTitle } from "@/features/guests/guests";
import { clearOwnerSession, getCurrentOwner } from "@/lib/session";

async function requireOwner() {
  const owner = await getCurrentOwner();
  if (!owner) throw new Error("Unauthorized");
  return owner;
}

export async function addBlockAction(startIso: string, minutes: number) {
  const owner = await requireOwner();
  await addBlock(owner.id, new Date(startIso), minutes);
}

export async function removeBlockAction(blockId: string) {
  const owner = await requireOwner();
  await removeBlock(owner.id, blockId);
}

export async function updateMaskTitleAction(guestId: string, maskTitle: string) {
  const owner = await requireOwner();
  try {
    await updateMaskTitle(owner.id, guestId, maskTitle);
  } catch (e) {
    if (e instanceof GuestError) return { ok: false as const, message: e.message };
    throw e;
  }
  revalidatePath("/me");
  return { ok: true as const };
}

export async function deleteGuestAction(guestId: string) {
  const owner = await requireOwner();
  await deleteGuest(owner.id, guestId);
  revalidatePath("/me");
}

export async function logoutAction() {
  await clearOwnerSession();
  redirect("/");
}
