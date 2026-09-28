import { randomBytes } from "node:crypto";
import { SYNC } from "@/config/sync";
import { prisma } from "@/lib/db";

// 予約を iCal（RFC 5545）の形で出す。所有者が Google カレンダーの「URL で追加」に登録して使う

const newToken = () => randomBytes(24).toString("base64url");

/** 購読 URL の鍵。まだ無ければ作る */
export async function ensureFeedToken(ownerId: string): Promise<string> {
  const owner = await prisma.owner.findUniqueOrThrow({ where: { id: ownerId } });
  if (owner.feedToken) return owner.feedToken;
  const updated = await prisma.owner.update({ where: { id: ownerId }, data: { feedToken: newToken() } });
  return updated.feedToken!;
}

/** 購読 URL を作り直す。古い URL は使えなくなる */
export async function regenerateFeedToken(ownerId: string) {
  await prisma.owner.update({ where: { id: ownerId }, data: { feedToken: newToken() } });
}

export function findOwnerByFeedToken(token: string) {
  return prisma.owner.findUnique({ where: { feedToken: token } });
}

/** 確定済みの予約を、予定名だけを載せた iCal にする。相手の名前や用件は載せない */
export async function buildFeed(ownerId: string, now = new Date()): Promise<string> {
  const bookings = await prisma.booking.findMany({
    where: {
      ownerId,
      status: "CONFIRMED",
      endAt: { gt: new Date(now.getTime() - SYNC.feedPastDays * 86_400_000) },
    },
    orderBy: { startAt: "asc" },
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Comadori//Bookings//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:コマドリの予約",
    ...bookings.flatMap((b) => [
      "BEGIN:VEVENT",
      `UID:${b.id}@comadori`,
      `DTSTAMP:${formatUtc(b.confirmedAt ?? b.createdAt)}`,
      `DTSTART:${formatUtc(b.startAt)}`,
      `DTEND:${formatUtc(b.endAt)}`,
      `SUMMARY:${escapeText(b.title)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** 20261008T023000Z の形 */
function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** テキスト値の特殊文字をエスケープする（RFC 5545 3.3.11） */
function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** 1行 75 バイトを超えたら折り返す（RFC 5545 3.1）。マルチバイト文字の途中では切らない */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // 続きの行は先頭の空白1バイトを含めて75
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}
