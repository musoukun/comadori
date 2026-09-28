"use server";

import { redirect } from "next/navigation";
import { addBlock, removeBlock } from "@/features/availability/blocks";
import { clearOwnerSession, getCurrentOwner } from "@/lib/session";

async function requireOwner() {
  const owner = await getCurrentOwner();
  if (!owner) throw new Error("Unauthorized");
  return owner;
}

export async function addBlockAction(startIso: string) {
  const owner = await requireOwner();
  await addBlock(owner.id, new Date(startIso));
}

export async function removeBlockAction(blockId: string) {
  const owner = await requireOwner();
  await removeBlock(owner.id, blockId);
}

export async function logoutAction() {
  await clearOwnerSession();
  redirect("/");
}
