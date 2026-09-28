import { isValidMeetingMinutes } from "@/config/scheduling";
import { prisma } from "@/lib/db";

/** 所有者が指定した長さだけ時間をふさぐ */
export async function addBlock(ownerId: string, start: Date, minutes: number) {
  if (!isValidMeetingMinutes(minutes)) throw new Error("Invalid block length");
  const end = new Date(start.getTime() + minutes * 60_000);
  await prisma.block.create({ data: { ownerId, startAt: start, endAt: end } });
}

export async function removeBlock(ownerId: string, blockId: string) {
  await prisma.block.deleteMany({ where: { id: blockId, ownerId } });
}
