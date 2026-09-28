import { SYNC } from "@/config/sync";
import type { Owner } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fetchBusy } from "@/lib/google";
import type { Interval } from "@/lib/time";

export class ImportError extends Error {}

export type BusyInput = { start: string; end: string };

/**
 * ブラウザで .ics から取り出した「埋まっている時間帯」を保存する。
 * 取り込むたびに前回の分は捨てて入れ替える。予定の中身は受け取らない
 */
export async function importBusy(ownerId: string, input: BusyInput[], untilIso: string, now = new Date()) {
  const until = new Date(untilIso);
  const maxUntil = new Date(now.getTime() + SYNC.maxImportDays * 86_400_000);
  if (Number.isNaN(until.getTime()) || until <= now || until > maxUntil) {
    throw new ImportError("取り込む期間が正しくありません。");
  }
  if (input.length > SYNC.maxImportIntervals) {
    throw new ImportError(`予定が多すぎます（${SYNC.maxImportIntervals}件まで）。期間を短くしてください。`);
  }

  const intervals = input.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
  if (intervals.some((b) => Number.isNaN(b.start.getTime()) || Number.isNaN(b.end.getTime()) || b.start >= b.end)) {
    throw new ImportError("予定の時間が正しくありません。");
  }

  await prisma.$transaction([
    prisma.importedBusy.deleteMany({ where: { ownerId } }),
    prisma.importedBusy.createMany({
      data: intervals.map((b) => ({ ownerId, startAt: b.start, endAt: b.end })),
    }),
    prisma.owner.update({ where: { id: ownerId }, data: { busyImportedAt: now, busyImportedUntil: until } }),
  ]);
  return { count: intervals.length };
}

/** Google カレンダー（API 連携時）と取り込んだ予定の「埋まっている時間帯」をまとめて返す */
export async function getExternalBusy(owner: Owner, from: Date, to: Date): Promise<Interval[]> {
  const [fromGoogle, imported] = await Promise.all([
    fetchBusy(owner, from, to),
    prisma.importedBusy.findMany({
      where: { ownerId: owner.id, startAt: { lt: to }, endAt: { gt: from } },
      select: { startAt: true, endAt: true },
    }),
  ]);
  return [...fromGoogle, ...imported.map((b) => ({ start: b.startAt, end: b.endAt }))];
}
