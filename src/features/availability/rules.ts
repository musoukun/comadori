import { SCHEDULING } from "@/config/scheduling";
import { dateKeyToDate, localDateKey, toLocalParts, type Interval } from "@/lib/time";

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** 所有者の受付終了時刻（0時からの分）。未設定なら初期値 */
export function dayEndOf(owner: { dayEndMinutes: number | null }): number {
  return owner.dayEndMinutes ?? SCHEDULING.defaultDayEndMinutes;
}

/** 所有者が設定できる受付終了時刻か。開始より後で、15分刻み */
export function isValidDayEnd(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes % SCHEDULING.slotMinutes === 0 &&
    minutes > SCHEDULING.dayStartHour * 60 &&
    minutes <= SCHEDULING.latestDayEndMinutes
  );
}

/** 受付の曜日・時間帯・期間の中に収まっているか */
export function isInsideWindow(range: Interval, now: Date, dayEndMinutes: number): boolean {
  const earliest = new Date(now.getTime() + SCHEDULING.minLeadHours * 3_600_000);
  const latest = dateKeyToDate(localDateKey(now)).getTime() + SCHEDULING.daysAhead * 86_400_000;
  if (range.start < earliest || range.end.getTime() > latest) return false;

  const start = toLocalParts(range.start);
  const lengthMinutes = (range.end.getTime() - range.start.getTime()) / 60_000;
  return (
    (SCHEDULING.workdays as readonly number[]).includes(start.weekday) &&
    start.minutes % SCHEDULING.slotMinutes === 0 &&
    start.minutes >= SCHEDULING.dayStartHour * 60 &&
    start.minutes + lengthMinutes <= dayEndMinutes
  );
}

/** 開始時刻と長さ（分）から時間帯を作る */
export function rangeFrom(start: Date, minutes: number): Interval {
  return { start, end: new Date(start.getTime() + minutes * 60_000) };
}
