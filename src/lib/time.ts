import { SCHEDULING } from "@/config/scheduling";

// 日本時間は夏時間が無いので、固定のずれで変換する
const OFFSET_MS = SCHEDULING.tzOffsetMinutes * 60_000;
export type Interval = { start: Date; end: Date };

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

export function toLocalParts(date: Date) {
  const t = new Date(date.getTime() + OFFSET_MS);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
    weekday: t.getUTCDay(),
  };
}

/** 日本時間の年月日と0時からの分数を Date にする */
export function fromLocal(y: number, m: number, d: number, minutes = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD"（日本時間の日付） */
export function localDateKey(date: Date): string {
  const p = toLocalParts(date);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

export function dateKeyToDate(key: string, minutes = 0): Date {
  const { y, m, d } = parseDateKey(key);
  return fromLocal(y, m, d, minutes);
}

export function addDays(key: string, days: number): string {
  const { y, m, d } = parseDateKey(key);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && addDays(key, 0) === key;
}

/** "10/8(水)" */
export function formatDayLabel(key: string): string {
  const { y, m, d } = parseDateKey(key);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}/${d}(${WEEKDAY_JA[weekday]})`;
}

/** "11:30" */
export function formatTime(date: Date): string {
  const { minutes } = toLocalParts(date);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** "2026/10/8(木)" */
export function formatDate(date: Date): string {
  const p = toLocalParts(date);
  return `${p.y}/${p.m}/${p.d}(${WEEKDAY_JA[p.weekday]})`;
}

/** "2026/10/8(木) 11:30〜12:30" */
export function formatRange(start: Date, end: Date): string {
  return `${formatDate(start)} ${formatTime(start)}〜${formatTime(end)}`;
}
