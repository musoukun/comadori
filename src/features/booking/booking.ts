import { createHash, randomBytes } from "node:crypto";
import { SCHEDULING } from "@/config/scheduling";
import { isInsideWindow, meetingRange, overlaps } from "@/features/availability/rules";
import { activeBookingWhere } from "@/features/availability/week";
import { prisma } from "@/lib/db";
import { fetchBusy } from "@/lib/google";
import { sendMail } from "@/lib/mail";
import { formatRange } from "@/lib/time";

export class BookingError extends Error {}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * コマを仮押さえする。重なりの判定はここで行う。
 * 所有者の行を先に更新して行ロックを取り、同じ所有者への仮押さえを1件ずつ処理する
 */
export async function holdSlot(slug: string, start: Date, now = new Date()) {
  const owner = await prisma.owner.findUnique({ where: { slug } });
  if (!owner) throw new BookingError("予約ページが見つかりません。");

  const range = meetingRange(start);
  if (!isInsideWindow(range, now)) throw new BookingError("この時間は予約できません。");

  const busy = await fetchBusy(owner.googleRefreshToken, range.start, range.end);
  if (busy.some((b) => overlaps(range, b))) throw new BookingError("この時間は予約できません。");

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + SCHEDULING.holdMinutes * 60_000);
  const overlapWhere = { ownerId: owner.id, startAt: { lt: range.end }, endAt: { gt: range.start } };

  const booking = await prisma.$transaction(async (tx) => {
    await tx.owner.update({ where: { id: owner.id }, data: { version: { increment: 1 } } });
    const blockCount = await tx.block.count({ where: overlapWhere });
    const bookingCount = await tx.booking.count({
      where: { ...overlapWhere, ...activeBookingWhere(now) },
    });
    if (blockCount + bookingCount > 0) throw new BookingError("この時間は予約できません。");

    // 期限切れの仮押さえは判定に使わないので、ついでに片付ける
    await tx.booking.deleteMany({
      where: { ownerId: owner.id, status: "HELD", holdExpiresAt: { lte: now } },
    });
    return tx.booking.create({
      data: {
        ownerId: owner.id,
        startAt: range.start,
        endAt: range.end,
        status: "HELD",
        holdExpiresAt: expiresAt,
        holdTokenHash: hashToken(token),
      },
    });
  });

  return {
    id: booking.id,
    token,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export type GuestInput = { name: string; email: string; note: string };

/** 仮押さえを押さえた本人だけが、期限内に確定できる */
export async function confirmHold(id: string, token: string, input: GuestInput, now = new Date()) {
  const name = input.name.trim();
  if (!name) throw new BookingError("お名前を入力してください。");

  const updated = await prisma.booking.updateMany({
    where: { id, status: "HELD", holdExpiresAt: { gt: now }, holdTokenHash: hashToken(token) },
    data: {
      status: "CONFIRMED",
      guestName: name,
      guestEmail: input.email.trim() || null,
      note: input.note.trim() || null,
      confirmedAt: now,
      holdExpiresAt: null,
      holdTokenHash: null,
    },
  });
  if (updated.count === 0) {
    throw new BookingError("仮押さえが無効になりました。もう一度時間を選んでください。");
  }

  const booking = await prisma.booking.findUniqueOrThrow({ where: { id }, include: { owner: true } });
  const when = formatRange(booking.startAt, booking.endAt);
  await sendMail({
    to: booking.owner.email,
    subject: `【コマドリ】予約が入りました ${when}`,
    text: [
      "コマドリに予約が入りました。",
      "",
      `日時: ${when}`,
      `お名前: ${booking.guestName}`,
      `連絡先: ${booking.guestEmail ?? "（未入力）"}`,
      `用件: ${booking.note ?? "（未入力）"}`,
    ].join("\n"),
  });
  return { start: booking.startAt.toISOString(), end: booking.endAt.toISOString() };
}

/** 仮押さえをやめて、コマを空きに戻す */
export async function releaseHold(id: string, token: string) {
  await prisma.booking.deleteMany({
    where: { id, status: "HELD", holdTokenHash: hashToken(token) },
  });
}
