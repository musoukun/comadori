import { SYNC } from "@/config/sync";
import type { Owner } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fetchBusy } from "@/lib/google";
import type { Interval } from "@/lib/time";

export class ImportError extends Error {}

/** 予定名は所有者の画面にだけ出す。古い GAS スクリプトは送ってこないので省略できる */
export type BusyInput = { start: string; end: string; title?: string | null };

/** 取り込んだ埋まり。予定名があれば一緒に持つ */
export type BusyInterval = Interval & { title?: string };

const MAX_TITLE_LENGTH = 200;

function cleanTitle(title: unknown): string | null {
  if (typeof title !== "string") return null;
  const text = title.trim().slice(0, MAX_TITLE_LENGTH);
  return text || null;
}

/**
 * 自分のカレンダーの「埋まっている時間帯」と予定名を保存する。
 * 取り込むたびに前回の分は捨てて入れ替える。予定名は所有者の画面にだけ出す
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

  const intervals = input.map((b) => ({ start: new Date(b.start), end: new Date(b.end), title: cleanTitle(b.title) }));
  if (intervals.some((b) => Number.isNaN(b.start.getTime()) || Number.isNaN(b.end.getTime()) || b.start >= b.end)) {
    throw new ImportError("予定の時間が正しくありません。");
  }

  await prisma.$transaction([
    prisma.importedBusy.deleteMany({ where: { ownerId } }),
    prisma.importedBusy.createMany({
      data: intervals.map((b) => ({ ownerId, startAt: b.start, endAt: b.end, title: b.title })),
    }),
    prisma.owner.update({ where: { id: ownerId }, data: { busyImportedAt: now, busyImportedUntil: until } }),
  ]);
  return { count: intervals.length };
}

/** Google カレンダー（API 連携時）と取り込んだ予定の「埋まっている時間帯」をまとめて返す */
export async function getExternalBusy(owner: Owner, from: Date, to: Date): Promise<BusyInterval[]> {
  const [fromGoogle, imported] = await Promise.all([
    fetchBusy(owner, from, to),
    prisma.importedBusy.findMany({
      where: { ownerId: owner.id, startAt: { lt: to }, endAt: { gt: from } },
      select: { startAt: true, endAt: true, title: true },
    }),
  ]);
  return [
    ...fromGoogle,
    ...imported.map((b) => ({ start: b.startAt, end: b.endAt, title: b.title ?? undefined })),
  ];
}
