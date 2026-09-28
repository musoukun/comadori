import { randomBytes } from "node:crypto";
import { SYNC } from "@/config/sync";
import { prisma } from "@/lib/db";

// GAS（Google Apps Script）連携。所有者が自分の Google アカウントでスクリプトを動かし、
// 決まった間隔で「予約をカレンダーに反映」と「埋まっている時間帯を送る」を行う。
// スクリプトは本人だけが使うので、Google の審査は要らない（個人利用）

const newToken = () => randomBytes(24).toString("base64url");

/** GAS 連携の鍵。まだ無ければ作る */
export async function ensureGasToken(ownerId: string): Promise<string> {
  const owner = await prisma.owner.findUniqueOrThrow({ where: { id: ownerId } });
  if (owner.gasToken) return owner.gasToken;
  const updated = await prisma.owner.update({ where: { id: ownerId }, data: { gasToken: newToken() } });
  return updated.gasToken!;
}

/** 鍵を作り直す。貼り付け済みのスクリプトは動かなくなる */
export async function regenerateGasToken(ownerId: string) {
  await prisma.owner.update({ where: { id: ownerId }, data: { gasToken: newToken() } });
}

/** Authorization: Bearer <鍵> から所有者を探す */
export async function findOwnerByGasRequest(request: Request) {
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  return token ? prisma.owner.findUnique({ where: { gasToken: token } }) : null;
}

/**
 * GAS がカレンダーと突き合わせる予約の一覧。
 * GAS はこの期間の中で、一覧に無い「コマドリの予定」を消す
 */
export async function bookingsForGas(ownerId: string, now = new Date()) {
  const from = new Date(now.getTime() - SYNC.feedPastDays * 86_400_000);
  const until = new Date(now.getTime() + SYNC.maxImportDays * 86_400_000);
  const bookings = await prisma.booking.findMany({
    where: { ownerId, status: "CONFIRMED", startAt: { lt: until }, endAt: { gt: from } },
    orderBy: { startAt: "asc" },
    select: { id: true, startAt: true, endAt: true, title: true },
  });
  return {
    from: from.toISOString(),
    until: until.toISOString(),
    bookings: bookings.map((b) => ({
      id: b.id,
      start: b.startAt.toISOString(),
      end: b.endAt.toISOString(),
      title: b.title,
    })),
  };
}

export async function markGasSynced(ownerId: string, now = new Date()) {
  await prisma.owner.update({ where: { id: ownerId }, data: { gasSyncedAt: now } });
}

/** 所有者が Apps Script に貼り付けるスクリプト。URL と鍵を埋め込んで渡す */
export function buildGasScript(appUrl: string, token: string): string {
  return `// コマドリ連携スクリプト
// 1. このまま Apps Script に貼り付けて保存する
// 2. 上の関数の選択で「setup」を選び、「実行」を押して許可する
// 以降は ${SYNC.gasIntervalMinutes} 分ごとに自動で同期します。止めるときは「トリガー」から削除してください。

const COMADORI_URL = ${JSON.stringify(appUrl)};
const TOKEN = ${JSON.stringify(token)};
const SYNC_DAYS = ${SYNC.gasSyncDays};
const INTERVAL_MINUTES = ${SYNC.gasIntervalMinutes};
const TAG = "comadoriId";

/** 最初に1回だけ実行する。定期実行を登録して、すぐに1回同期する */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(function (trigger) { return trigger.getHandlerFunction() === "sync"; })
    .forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger("sync").timeBased().everyMinutes(INTERVAL_MINUTES).create();
  sync();
  Logger.log("コマドリとの連携を始めました。");
}

/** 予約をカレンダーに反映し、埋まっている時間帯をコマドリに送る */
function sync() {
  const calendar = CalendarApp.getDefaultCalendar();
  syncBookings(calendar);
  sendBusy(calendar);
}

function callComadori(method, path, body) {
  const options = { method: method, headers: { Authorization: "Bearer " + TOKEN }, muteHttpExceptions: true };
  if (body) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(body);
  }
  const response = UrlFetchApp.fetch(COMADORI_URL + path, options);
  if (response.getResponseCode() !== 200) {
    throw new Error("コマドリとの通信に失敗しました: " + response.getResponseCode() + " " + response.getContentText());
  }
  return JSON.parse(response.getContentText());
}

/** コマドリの予約を、予定名だけでカレンダーに作る・直す・消す */
function syncBookings(calendar) {
  const data = callComadori("get", "/api/gas/bookings");
  const existing = {};
  calendar.getEvents(new Date(data.from), new Date(data.until)).forEach(function (event) {
    const id = event.getTag(TAG);
    if (id) existing[id] = event;
  });
  data.bookings.forEach(function (booking) {
    const start = new Date(booking.start);
    const end = new Date(booking.end);
    const event = existing[booking.id];
    if (!event) {
      calendar.createEvent(booking.title, start, end).setTag(TAG, booking.id);
      return;
    }
    if (event.getTitle() !== booking.title) event.setTitle(booking.title);
    if (event.getStartTime().getTime() !== start.getTime() || event.getEndTime().getTime() !== end.getTime()) {
      event.setTime(start, end);
    }
    delete existing[booking.id];
  });
  // 取り消された予約の予定を消す
  Object.keys(existing).forEach(function (id) { existing[id].deleteEvent(); });
}

/** 埋まっている時間帯だけを送る。予定名や中身は送らない */
function sendBusy(calendar) {
  const now = new Date();
  const until = new Date(now.getTime() + SYNC_DAYS * 86400000);
  const busy = calendar.getEvents(now, until).filter(isBusy).map(function (event) {
    return { start: event.getStartTime().toISOString(), end: event.getEndTime().toISOString() };
  });
  callComadori("post", "/api/gas/busy", { busy: busy, until: until.toISOString() });
}

function isBusy(event) {
  if (event.getTag(TAG)) return false; // コマドリの予約はコマドリ側で数える
  const type = event.getEventType();
  if (type === CalendarApp.EventType.OUT_OF_OFFICE) return true;
  if (event.isAllDayEvent()) return false; // 終日の予定（誕生日・祝日など）は空き扱い
  if (type === CalendarApp.EventType.WORKING_LOCATION || type === CalendarApp.EventType.BIRTHDAY) return false;
  if (event.getMyStatus() === CalendarApp.GuestStatus.NO) return false; // 欠席と答えた予定
  return true;
}
`;
}
