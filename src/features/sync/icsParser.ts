// ブラウザの中だけで動く .ics の読み取り。予定の説明や参加者などは捨て、「埋まっている時間帯」と予定名だけを返す
import { strFromU8, unzipSync } from "fflate";
import ICAL from "ical.js";
import { SYNC } from "@/config/sync";

export type CalendarFile = { name: string; text: string };
export type BusyRange = { start: Date; end: Date; title?: string };

/** 選んだファイル（.ics か、Google のエクスポートの .zip）から、カレンダーごとの中身を取り出す */
export async function readCalendarFiles(files: File[]): Promise<CalendarFile[]> {
  const result: CalendarFile[] = [];
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      for (const [path, data] of Object.entries(entries)) {
        if (path.toLowerCase().endsWith(".ics")) result.push(toCalendarFile(path, strFromU8(data)));
      }
    } else {
      result.push(toCalendarFile(file.name, await file.text()));
    }
  }
  return result;
}

/** カレンダー名は X-WR-CALNAME、無ければファイル名 */
function toCalendarFile(path: string, text: string): CalendarFile {
  const name = /^X-WR-CALNAME:(.*)$/m.exec(text)?.[1]?.trim();
  return { name: name || path.split("/").pop()!, text };
}

/** 空き時間として扱う予定か。「予定なし」表示（TRANSPARENT）と、キャンセル済みは埋まりにしない */
function isFree(component: ICAL.Component): boolean {
  const transp = String(component.getFirstPropertyValue("transp") ?? "").toUpperCase();
  const status = String(component.getFirstPropertyValue("status") ?? "").toUpperCase();
  return transp === "TRANSPARENT" || status === "CANCELLED";
}

/** カレンダーの中身から、期間 [from, to) に重なる埋まりを取り出す。繰り返し予定も展開する */
export function extractBusy(texts: string[], from: Date, to: Date): BusyRange[] {
  const busy: BusyRange[] = [];
  const push = (start: Date, end: Date, title: string) => {
    if (start < to && end > from) busy.push({ start, end, title: title || undefined });
  };

  for (const text of texts) {
    const calendar = new ICAL.Component(ICAL.parse(text));
    for (const tz of calendar.getAllSubcomponents("vtimezone")) {
      const tzid = String(tz.getFirstPropertyValue("tzid"));
      if (!ICAL.TimezoneService.has(tzid)) ICAL.TimezoneService.register(tz);
    }

    const vevents = calendar.getAllSubcomponents("vevent");
    const exceptionsByUid = new Map<string, ICAL.Component[]>();
    for (const vevent of vevents) {
      if (!vevent.hasProperty("recurrence-id")) continue;
      const uid = String(vevent.getFirstPropertyValue("uid"));
      exceptionsByUid.set(uid, [...(exceptionsByUid.get(uid) ?? []), vevent]);
    }

    for (const vevent of vevents) {
      if (vevent.hasProperty("recurrence-id")) continue;
      const uid = String(vevent.getFirstPropertyValue("uid"));
      const event = new ICAL.Event(vevent, { exceptions: exceptionsByUid.get(uid) ?? [] });
      exceptionsByUid.delete(uid);

      if (!event.isRecurring()) {
        if (!isFree(vevent)) push(event.startDate.toJSDate(), event.endDate.toJSDate(), event.summary);
        continue;
      }

      const iterator = event.iterator();
      for (let i = 0, next = iterator.next(); next && i < SYNC.maxOccurrencesPerEvent; i++, next = iterator.next()) {
        const occurrence = event.getOccurrenceDetails(next);
        const start = occurrence.startDate.toJSDate();
        if (start >= to && occurrence.recurrenceId.toJSDate() >= to) break;
        if (!isFree(occurrence.item.component)) push(start, occurrence.endDate.toJSDate(), occurrence.item.summary);
      }
    }

    // 元の繰り返し予定が見つからない変更分は、1回きりの予定として扱う
    for (const orphans of exceptionsByUid.values()) {
      for (const vevent of orphans) {
        if (isFree(vevent)) continue;
        const event = new ICAL.Event(vevent);
        push(event.startDate.toJSDate(), event.endDate.toJSDate(), event.summary);
      }
    }
  }
  // 予定名を残したいので、重なる予定もまとめずにそのまま返す
  return busy.sort((a, b) => a.start.getTime() - b.start.getTime());
}
