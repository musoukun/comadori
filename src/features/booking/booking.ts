import { GUESTS } from "@/config/guests";
import { isValidMeetingMinutes, SCHEDULING } from "@/config/scheduling";
import { dayEndOf, isInsideWindow, overlaps, rangeFrom } from "@/features/availability/rules";
import { activeBookingWhere } from "@/features/availability/week";
import type { Guest, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { canWriteEvents, createEvent, deleteEvent, fetchBusy, updateEventSummary } from "@/lib/google";
import { sendMail } from "@/lib/mail";
import { formatRange } from "@/lib/time";

export class BookingError extends Error {}

/**
 * ログイン中の相手がコマを仮押さえする。重なりの判定はここで行う。
 * 所有者の行を先に更新して行ロックを取り、同じ所有者への仮押さえを1件ずつ処理する
 */
export async function holdSlot(guest: Guest, start: Date, minutes: number, now = new Date()) {
  if (!isValidMeetingMinutes(minutes)) throw new BookingError("予約の長さが正しくありません。");
  const range = rangeFrom(start, minutes);
  const owner = await prisma.owner.findUniqueOrThrow({ where: { id: guest.ownerId } });
  if (!isInsideWindow(range, now, dayEndOf(owner))) throw new BookingError("この時間は予約できません。");

  const busy = await fetchBusy(owner.googleRefreshToken, range.start, range.end);
  if (busy.some((b) => overlaps(range, b))) throw new BookingError("この時間は予約できません。");

  const expiresAt = new Date(now.getTime() + SCHEDULING.holdMinutes * 60_000);
  const overlapWhere = { ownerId: owner.id, startAt: { lt: range.end }, endAt: { gt: range.start } };

  const booking = await prisma.$transaction(async (tx) => {
    await tx.owner.update({ where: { id: owner.id }, data: { version: { increment: 1 } } });
    // 1人が押さえられる仮押さえは1つだけ。選び直したら前の仮押さえは外す
    await tx.booking.deleteMany({ where: { guestId: guest.id, status: "HELD" } });
    // 期限切れの仮押さえは判定に使わないので、ついでに片付ける
    await tx.booking.deleteMany({
      where: { ownerId: owner.id, status: "HELD", holdExpiresAt: { lte: now } },
    });

    const blockCount = await tx.block.count({ where: overlapWhere });
    const bookingCount = await tx.booking.count({
      where: { ...overlapWhere, ...activeBookingWhere(now) },
    });
    if (blockCount + bookingCount > 0) throw new BookingError("この時間は予約できません。");

    return tx.booking.create({
      data: {
        ownerId: owner.id,
        guestId: guest.id,
        startAt: range.start,
        endAt: range.end,
        status: "HELD",
        title: guest.maskTitle,
        guestName: guest.name,
        holdExpiresAt: expiresAt,
      },
    });
  });

  return toHold(booking);
}

function toHold(booking: { id: string; startAt: Date; endAt: Date; holdExpiresAt: Date | null }) {
  return {
    id: booking.id,
    start: booking.startAt.toISOString(),
    end: booking.endAt.toISOString(),
    expiresAt: booking.holdExpiresAt!.toISOString(),
  };
}

export type Hold = ReturnType<typeof toHold>;

/** 相手の、期限内の仮押さえ。再読み込みしても入力を続けられるように返す */
export async function findActiveHold(guestId: string, now = new Date()): Promise<Hold | null> {
  const booking = await prisma.booking.findFirst({
    where: { guestId, status: "HELD", holdExpiresAt: { gt: now } },
  });
  return booking ? toHold(booking) : null;
}

export type ConfirmInput = { note: string; title: string };

/** 相手が決めた予定名。相手に許可されていない、または空欄なら null（所有者の予定名のまま） */
function guestTitleOf(guest: Guest, title: string): string | null {
  const text = title.trim();
  if (!guest.useGuestTitle || !text) return null;
  if (text.length > GUESTS.maxTextLength) {
    throw new BookingError(`予定名は${GUESTS.maxTextLength}文字以内で入力してください。`);
  }
  return text;
}

/** 仮押さえを押さえた本人だけが、期限内に確定できる */
export async function confirmHold(guest: Guest, bookingId: string, input: ConfirmInput, now = new Date()) {
  const guestTitle = guestTitleOf(guest, input.title);
  const updated = await prisma.booking.updateMany({
    where: { id: bookingId, guestId: guest.id, status: "HELD", holdExpiresAt: { gt: now } },
    data: {
      status: "CONFIRMED",
      note: input.note.trim() || null,
      confirmedAt: now,
      holdExpiresAt: null,
      ...(guestTitle ? { title: guestTitle, titleFromGuest: true } : {}),
    },
  });
  if (updated.count === 0) {
    throw new BookingError("仮押さえの期限が切れました。もう一度時間を選んでください。");
  }

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { owner: true },
  });
  const writtenToGoogle = await writeToGoogleCalendar(booking);
  await notifyOwner(booking, guest, writtenToGoogle);
  return { start: booking.startAt.toISOString(), end: booking.endAt.toISOString() };
}

type BookingWithOwner = Prisma.BookingGetPayload<{ include: { owner: true } }>;

/**
 * 予定名は所有者が決めたマスク用の名前だけを使い、相手の名前や用件は書かない。
 * 書き込みに失敗しても予約は確定のままにする
 */
async function writeToGoogleCalendar(booking: BookingWithOwner): Promise<boolean> {
  const { owner } = booking;
  if (!owner.googleRefreshToken || !canWriteEvents(owner.googleScopes)) return false;
  try {
    const eventId = await createEvent(owner.googleRefreshToken, {
      summary: booking.title,
      description: `コマドリから登録された予定です。\n${process.env.APP_URL}/me`,
      start: booking.startAt,
      end: booking.endAt,
    });
    await prisma.booking.update({ where: { id: booking.id }, data: { googleEventId: eventId } });
    return true;
  } catch (e) {
    console.error("[google] failed to create event", e);
    return false;
  }
}

async function notifyOwner(booking: BookingWithOwner, guest: Guest, writtenToGoogle: boolean) {
  const when = formatRange(booking.startAt, booking.endAt);
  await sendMail({
    to: booking.owner.email,
    subject: `【コマドリ】予約が入りました ${when}`,
    text: [
      "コマドリに予約が入りました。",
      "",
      `日時: ${when}`,
      `お名前: ${guest.name}`,
      `メール: ${guest.email}`,
      `用件: ${booking.note ?? "（未入力）"}`,
      "",
      writtenToGoogle
        ? `Googleカレンダーに「${booking.title}」として登録しました。`
        : "Googleカレンダーには登録されていません。",
    ].join("\n"),
  });
}

/** 仮押さえをやめて、コマを空きに戻す */
export async function releaseHold(guest: Guest, bookingId: string) {
  await prisma.booking.deleteMany({ where: { id: bookingId, guestId: guest.id, status: "HELD" } });
}

/** 相手が自分の確定済みの予約を取り消す。始まる前の予約だけ。Googleカレンダーの予定も消す */
export async function cancelBooking(guest: Guest, bookingId: string, now = new Date()) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, guestId: guest.id, status: "CONFIRMED", startAt: { gt: now } },
    include: { owner: true },
  });
  if (!booking) throw new BookingError("この予約は取り消せません。");

  await prisma.booking.delete({ where: { id: booking.id } });

  const { owner } = booking;
  let removedFromGoogle = false;
  if (booking.googleEventId && owner.googleRefreshToken) {
    try {
      await deleteEvent(owner.googleRefreshToken, booking.googleEventId);
      removedFromGoogle = true;
    } catch (e) {
      console.error("[google] failed to delete event", e);
    }
  }

  const when = formatRange(booking.startAt, booking.endAt);
  await sendMail({
    to: owner.email,
    subject: `【コマドリ】予約が取り消されました ${when}`,
    text: [
      "コマドリの予約が取り消されました。",
      "",
      `日時: ${when}`,
      `お名前: ${guest.name}`,
      "",
      booking.googleEventId
        ? removedFromGoogle
          ? `Googleカレンダーの「${booking.title}」を削除しました。`
          : `Googleカレンダーの「${booking.title}」を削除できませんでした。手で削除してください。`
        : "Googleカレンダーには登録されていませんでした。",
    ].join("\n"),
  });
}

/**
 * 所有者が相手の予定名を変えたら、その相手の予約とGoogleカレンダーの予定名も書き換える。
 * 相手が自分で決めた予定名の予約は書き換えない
 */
export async function renameGuestBookings(guestId: string, title: string) {
  const target = { guestId, titleFromGuest: false };
  await prisma.booking.updateMany({ where: target, data: { title } });

  const withEvents = await prisma.booking.findMany({
    where: { ...target, googleEventId: { not: null } },
    include: { owner: true },
  });
  for (const booking of withEvents) {
    if (!booking.owner.googleRefreshToken) continue;
    try {
      await updateEventSummary(booking.owner.googleRefreshToken, booking.googleEventId!, title);
    } catch (e) {
      console.error("[google] failed to rename event", e);
    }
  }
}
