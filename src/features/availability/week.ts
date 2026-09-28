import { SCHEDULING } from "@/config/scheduling";
import type { Owner } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { fetchBusy } from "@/lib/google";
import { addDays, dateKeyToDate, type Interval } from "@/lib/time";
import { isInsideWindow, meetingRange, overlaps } from "./rules";
import type { Day, GuestCell, OwnerCell, OwnerCellState } from "./types";

export const DAYS_PER_VIEW = 7;

/** 今ふさがっている予約（確定済み、または期限内の仮押さえ）の条件 */
export function activeBookingWhere(now: Date) {
  return {
    OR: [
      { status: "CONFIRMED" as const },
      { status: "HELD" as const, holdExpiresAt: { gt: now } },
    ],
  };
}

/**
 * Googleの埋まり・ブロック・予約を重ねて、1週間分のコマを作る。
 * 所有者向けの詳しい形で返し、ゲスト向けには toGuestDays で伏せる
 */
export async function buildOwnerWeek(
  owner: Owner,
  fromKey: string,
  now = new Date(),
): Promise<Day<OwnerCell>[]> {
  const from = dateKeyToDate(fromKey);
  const to = dateKeyToDate(addDays(fromKey, DAYS_PER_VIEW));
  const range = { startAt: { lt: to }, endAt: { gt: from } };

  const [busy, blocks, bookings] = await Promise.all([
    fetchBusy(owner.googleRefreshToken, from, to),
    prisma.block.findMany({ where: { ownerId: owner.id, ...range } }),
    prisma.booking.findMany({ where: { ownerId: owner.id, ...range, ...activeBookingWhere(now) } }),
  ]);

  const stateOf = (cell: Interval): Omit<OwnerCell, "start" | "end" | "bookable"> => {
    const booking = bookings.find((b) => overlaps(cell, { start: b.startAt, end: b.endAt }));
    if (booking?.status === "CONFIRMED") {
      return { state: "booked", guestName: booking.guestName ?? undefined };
    }
    if (booking) return { state: "held" };
    const block = blocks.find((b) => overlaps(cell, { start: b.startAt, end: b.endAt }));
    if (block) return { state: "block", blockId: block.id };
    if (busy.some((b) => overlaps(cell, b))) return { state: "google" };
    return { state: isInsideWindow(cell, now) ? "free" : "closed" };
  };

  const cellsPerMeeting = SCHEDULING.meetingMinutes / SCHEDULING.slotMinutes;

  return Array.from({ length: DAYS_PER_VIEW }, (_, i) => {
    const date = addDays(fromKey, i);
    const intervals: Interval[] = [];
    for (let m = SCHEDULING.dayStartHour * 60; m < SCHEDULING.dayEndHour * 60; m += SCHEDULING.slotMinutes) {
      intervals.push({
        start: dateKeyToDate(date, m),
        end: dateKeyToDate(date, m + SCHEDULING.slotMinutes),
      });
    }
    const states = intervals.map(stateOf);
    const cells = intervals.map((cell, j): OwnerCell => {
      const following = states.slice(j, j + cellsPerMeeting);
      const bookable =
        following.length === cellsPerMeeting &&
        following.every((s) => s.state === "free") &&
        isInsideWindow(meetingRange(cell.start), now);
      return { start: cell.start.toISOString(), end: cell.end.toISOString(), ...states[j], bookable };
    });
    return { date, cells };
  });
}

const GUEST_STATE: Record<OwnerCellState, GuestCell["state"]> = {
  free: "free",
  closed: "closed",
  google: "busy",
  block: "busy",
  booked: "busy",
  held: "held",
};

/** ゲストには予定の理由や名前を見せない */
export function toGuestDays(days: Day<OwnerCell>[]): Day<GuestCell>[] {
  return days.map((day) => ({
    date: day.date,
    cells: day.cells.map((c) => ({
      start: c.start,
      end: c.end,
      state: GUEST_STATE[c.state],
      bookable: c.bookable,
    })),
  }));
}
