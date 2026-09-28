"use client";

import { useState } from "react";
import { SYNC } from "@/config/sync";
import { extractBusy, readCalendarFiles, type CalendarFile } from "@/features/sync/icsParser";
import { importBusyAction } from "./actions";

/** .ics を選んで、埋まっている時間帯だけをサーバーに送る */
export function ImportPanel() {
  const [calendars, setCalendars] = useState<(CalendarFile & { checked: boolean })[]>([]);
  const [days, setDays] = useState<number>(SYNC.importDaysOptions[0]);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const onFiles = async (files: FileList | null) => {
    setMessage(null);
    if (!files?.length) return;
    try {
      const found = await readCalendarFiles([...files]);
      if (found.length === 0) setMessage("カレンダーのファイル（.ics）が見つかりませんでした。");
      setCalendars(found.map((c) => ({ ...c, checked: true })));
    } catch {
      setMessage("ファイルを読み込めませんでした。");
    }
  };

  const runImport = async () => {
    setWorking(true);
    setMessage(null);
    try {
      const from = new Date();
      const until = new Date(from.getTime() + days * 86_400_000);
      const busy = extractBusy(
        calendars.filter((c) => c.checked).map((c) => c.text),
        from,
        until,
      );
      const result = await importBusyAction(
        busy.map((b) => ({ start: b.start.toISOString(), end: b.end.toISOString() })),
        until.toISOString(),
      );
      setMessage(result.ok ? `${result.count}件の埋まっている時間を取り込みました。` : result.message);
      if (result.ok) setCalendars([]);
    } catch {
      setMessage("取り込みに失敗しました。ファイルを確かめてください。");
    }
    setWorking(false);
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".ics,.zip,text/calendar,application/zip"
        multiple
        onChange={(e) => onFiles(e.target.files)}
        className="input cursor-pointer"
      />
      {calendars.length > 0 && (
        <div className="space-y-3 rounded-xl border-[3px] border-dashed border-ink p-4">
          <p className="text-sm font-bold">取り込むカレンダー</p>
          <ul className="space-y-1">
            {calendars.map((c, i) => (
              <li key={`${c.name}-${i}`}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={(e) =>
                      setCalendars(calendars.map((x, j) => (j === i ? { ...x, checked: e.target.checked } : x)))
                    }
                    className="h-5 w-5 accent-[var(--ink)]"
                  />
                  {c.name}
                </label>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 font-bold">
            期間
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="input w-auto cursor-pointer py-1.5 font-bold"
            >
              {SYNC.importDaysOptions.map((d) => (
                <option key={d} value={d}>
                  今日から{d}日
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-yellow"
            onClick={runImport}
            disabled={working || !calendars.some((c) => c.checked)}
          >
            取り込む
          </button>
        </div>
      )}
      {message && <p className="font-bold">{message}</p>}
    </div>
  );
}
