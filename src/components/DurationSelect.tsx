"use client";

import { formatMinutes, MEETING_MINUTES_OPTIONS } from "@/config/scheduling";

export function DurationSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 font-bold">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input w-auto cursor-pointer py-1.5 font-bold"
      >
        {MEETING_MINUTES_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {formatMinutes(m)}
          </option>
        ))}
      </select>
    </label>
  );
}
