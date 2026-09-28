import { SCHEDULING } from "@/config/scheduling";
import { prisma } from "@/lib/db";

/** 所有者がコマを1つふさぐ */
export async function addBlock(ownerId: string, start: Date) {
  const end = new Date(start.getTime() + SCHEDULING.slotMinutes * 60_000);
  await prisma.block.create({ data: { ownerId, startAt: start, endAt: end } });
}

export async function removeBlock(ownerId: string, blockId: string) {
  await prisma.block.deleteMany({ where: { id: blockId, ownerId } });
}
