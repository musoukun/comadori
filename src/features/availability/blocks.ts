import { SCHEDULING } from "@/config/scheduling";
import { prisma } from "@/lib/db";

const MAX_BLOCK_MINUTES = 24 * 60;

/** 所有者が指定した長さだけ時間をふさぐ。長さはコマの倍数で、1日以内 */
export async function addBlock(ownerId: string, start: Date, minutes: number) {
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes % SCHEDULING.slotMinutes !== 0 || minutes > MAX_BLOCK_MINUTES) {
    throw new Error("Invalid block length");
  }
  const end = new Date(start.getTime() + minutes * 60_000);
  await prisma.block.create({ data: { ownerId, startAt: start, endAt: end } });
}

export async function removeBlock(ownerId: string, blockId: string) {
  await prisma.block.deleteMany({ where: { id: blockId, ownerId } });
}
