"use server";

import { revalidatePath } from "next/cache";
import { regenerateFeedToken } from "@/features/sync/feed";
import { regenerateGasToken } from "@/features/sync/gas";
import { ImportError, importBusy, type BusyInput } from "@/features/sync/importedBusy";
import { getCurrentOwner } from "@/lib/session";

async function requireOwner() {
  const owner = await getCurrentOwner();
  if (!owner) throw new Error("Unauthorized");
  return owner;
}

export async function importBusyAction(busy: BusyInput[], untilIso: string) {
  const owner = await requireOwner();
  try {
    const { count } = await importBusy(owner.id, busy, untilIso);
    revalidatePath("/me");
    revalidatePath("/me/sync");
    return { ok: true as const, count };
  } catch (e) {
    if (e instanceof ImportError) return { ok: false as const, message: e.message };
    throw e;
  }
}

export async function regenerateFeedAction() {
  const owner = await requireOwner();
  await regenerateFeedToken(owner.id);
  revalidatePath("/me/sync");
}

export async function regenerateGasAction() {
  const owner = await requireOwner();
  await regenerateGasToken(owner.id);
  revalidatePath("/me/sync");
}
