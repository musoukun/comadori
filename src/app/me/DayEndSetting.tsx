"use client";

import { useState } from "react";
import { SCHEDULING } from "@/config/scheduling";
import { isValidDayEnd } from "@/features/availability/rules";
import { updateDayEndAction } from "./actions";

const HOURS = Array.from(
  { length: Math.floor(SCHEDULING.latestDayEndMinutes / 60) - SCHEDULING.dayStartHour + 1 },
  (_, i) => SCHEDULING.dayStartHour + i,
);
const MINUTES = Array.from({ length: 60 / SCHEDULING.slotMinutes }, (_, i) => i * SCHEDULING.slotMinutes);

/** 受付の終了時刻を、時と分のプルダウンで決める */
export function DayEndSetting({ initialMinutes, onSaved }: { initialMinutes: number; onSaved: () => void }) {
  const [saved, setSaved] = useState(initialMinutes);
  const [hour, setHour] = useState(Math.floor(initialMinutes / 60));
  const [minute, setMinute] = useState(initialMinutes % 60);
  const [saving, setSaving] = useState(false);
  const value = hour * 60 + minute;
  const valid = isValidDayEnd(value);

  const save = async () => {
    setSaving(true);
    await updateDayEndAction(value);
    setSaved(value);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 font-bold">
      <span>受付終了</span>
      <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="input w-auto cursor-pointer py-1.5 font-bold">
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}時
          </option>
        ))}
      </select>
      <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="input w-auto cursor-pointer py-1.5 font-bold">
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}分
          </option>
        ))}
      </select>
      <span>まで</span>
      <button type="button" className="btn btn-sm btn-yellow" onClick={save} disabled={saving || !valid || value === saved}>
        保存
      </button>
      {!valid && <span className="text-sm text-[#c0392b]">{SCHEDULING.dayStartHour}時より後にしてください</span>}
    </div>
  );
}
