"use client";

import { findColor, GUEST_COLORS } from "@/config/colors";

/** よく使う色をワンクリックで選ぶか、カラーピッカーで好きな色を選ぶ。他の人と同じ色でもよい */
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const current = findColor(value).hex.toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {GUEST_COLORS.map((c) => {
        const selected = current === c.hex.toLowerCase();
        return (
          <button
            key={c.id}
            type="button"
            title={c.name}
            aria-label={c.name}
            aria-pressed={selected}
            onClick={() => onChange(c.hex)}
            className={`h-8 w-8 rounded-full border-[3px] border-ink transition-transform ${
              selected ? "scale-110 shadow-[3px_3px_0_var(--ink)]" : "hover:-translate-y-0.5"
            }`}
            style={{ backgroundColor: c.hex }}
          />
        );
      })}
      <label className="btn btn-sm cursor-pointer gap-2" title="好きな色を選ぶ">
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded border-2 border-ink bg-transparent p-0"
        />
        好きな色
      </label>
    </div>
  );
}
