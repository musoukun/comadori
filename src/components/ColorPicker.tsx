"use client";

import { GUEST_COLORS } from "@/config/colors";

/** 色を1つ選ぶ。他の人が使っている色は選べない */
export function ColorPicker({
  value,
  taken,
  onChange,
}: {
  value: string | null;
  taken: string[];
  onChange: (colorId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {GUEST_COLORS.map((c) => {
        const isTaken = taken.includes(c.id);
        const selected = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            title={isTaken ? `${c.name}（使用中）` : c.name}
            aria-label={c.name}
            aria-pressed={selected}
            disabled={isTaken}
            onClick={() => onChange(c.id)}
            className={`relative h-9 w-9 rounded-full border-[3px] border-ink transition-transform disabled:cursor-not-allowed ${
              selected ? "scale-110 shadow-[3px_3px_0_var(--ink)]" : isTaken ? "opacity-25" : "hover:-translate-y-0.5"
            }`}
            style={{ backgroundColor: c.hex }}
          >
            {isTaken && (
              <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-ink">
                ×
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
