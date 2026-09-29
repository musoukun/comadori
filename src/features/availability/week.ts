import { SCHEDULING } from "@/config/scheduling";
import type { Owner } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getExternalBusy } from "@/features/sync/importedBusy";
import { addDays, dateKeyToDate, type Interval } from "@/lib/time";
import { dayEndOf, isInsideWindow, overlaps, rangeFrom } from "./rules";
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
 * 自分のカレンダーの埋まり・ブロック・予約を重ねて、1週間分のコマを作る。
 * 所有者向けの詳しい形で返し、ゲスト向けには toGuestDays で伏せる
 */
export async function buildOwnerWeek(
  owner: Owner,
  fromKey: string,
  meetingMinutes: number,
  now = new Date(),
): Promise<Day<OwnerCell>[]> {
  const from = dateKeyToDate(fromKey);
  const to = dateKeyToDate(addDays(fromKey, DAYS_PER_VIEW));
  const range = { startAt: { lt: to }, endAt: { gt: from } };
  const dayEnd = dayEndOf(owner);

  const [busy, blocks, bookings] = await Promise.all([
    getExternalBusy(owner, from, to),
    prisma.block.findMany({ where: { ownerId: owner.id, ...range } }),
    prisma.booking.findMany({
      where: { ownerId: owner.id, ...range, ...activeBookingWhere(now) },
      include: { guest: { select: { colorId: true } } },
    }),
  ]);

  const stateOf = (cell: Interval): Omit<OwnerCell, "start" | "end" | "bookable"> => {
    const booking = bookings.find((b) => overlaps(cell, { start: b.startAt, end: b.endAt }));
    if (booking) {
      return {
        state: booking.status === "CONFIRMED" ? "booked" : "held",
        bookingId: booking.id,
        title: booking.title,
        guestId: booking.guestId ?? undefined,
        guestName: booking.guestName,
        colorId: booking.guest?.colorId,
      };
    }
    const block = blocks.find((b) => overlaps(cell, { start: b.startAt, end: b.endAt }));
    if (block) return { state: "block", blockId: block.id };
    const event = busy.find((b) => overlaps(cell, b));
    if (event) return { state: "calendar", calendarTitle: event.title };
    return { state: isInsideWindow(cell, now, dayEnd) ? "free" : "closed" };
  };

  const cellsPerMeeting = meetingMinutes / SCHEDULING.slotMinutes;

  return Array.from({ length: DAYS_PER_VIEW }, (_, i) => {
    const date = addDays(fromKey, i);
    const intervals: Interval[] = [];
    for (let m = SCHEDULING.dayStartHour * 60; m < dayEnd; m += SCHEDULING.slotMinutes) {
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
        isInsideWindow(rangeFrom(cell.start, meetingMinutes), now, dayEnd);
      return { start: cell.start.toISOString(), end: cell.end.toISOString(), ...states[j], bookable };
    });
    return { date, cells };
  });
}

const GUEST_STATE: Record<OwnerCellState, GuestCell["state"]> = {
  free: "free",
  closed: "closed",
  calendar: "busy",
  block: "busy",
  booked: "busy",
  held: "held",
};

function guestStateOf(cell: OwnerCell, guestId: string): GuestCell["state"] {
  if (cell.guestId === guestId && cell.state === "booked") return "mine";
  if (cell.guestId === guestId && cell.state === "held") return "myHold";
  return GUEST_STATE[cell.state];
}

/** 相手には、自分の予約以外は予定の理由や名前を見せない */
export function toGuestDays(days: Day<OwnerCell>[], guestId: string): Day<GuestCell>[] {
  return days.map((day) => ({
    date: day.date,
    cells: day.cells.map((c) => {
      const state = guestStateOf(c, guestId);
      return {
        start: c.start,
        end: c.end,
        state,
        bookable: c.bookable,
        bookingId: state === "mine" ? c.bookingId : undefined,
      };
    }),
  }));
}
