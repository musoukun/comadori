import { SCHEDULING } from "@/config/scheduling";
import { dateKeyToDate, localDateKey, toLocalParts, type Interval } from "@/lib/time";

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** 受付の曜日・時間帯・期間の中に収まっているか */
export function isInsideWindow(range: Interval, now: Date): boolean {
  const earliest = new Date(now.getTime() + SCHEDULING.minLeadHours * 3_600_000);
  const latest = dateKeyToDate(localDateKey(now)).getTime() + SCHEDULING.daysAhead * 86_400_000;
  if (range.start < earliest || range.end.getTime() > latest) return false;

  const start = toLocalParts(range.start);
  const lengthMinutes = (range.end.getTime() - range.start.getTime()) / 60_000;
  return (
    (SCHEDULING.workdays as readonly number[]).includes(start.weekday) &&
    start.minutes % SCHEDULING.slotMinutes === 0 &&
    start.minutes >= SCHEDULING.dayStartHour * 60 &&
    start.minutes + lengthMinutes <= SCHEDULING.dayEndHour * 60
  );
}

/** 開始時刻と長さ（分）から時間帯を作る */
export function rangeFrom(start: Date, minutes: number): Interval {
  return { start, end: new Date(start.getTime() + minutes * 60_000) };
}
