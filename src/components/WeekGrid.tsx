"use client";

import type { Day } from "@/features/availability/types";
import { addDays, formatDayLabel, formatTime, parseDateKey } from "@/lib/time";

export type CellView = {
  className: string;
  /** 同じ label が続く間は、先頭のコマにだけ表示する */
  label?: string;
  onClick?: () => void;
  title?: string;
};

type Props<C extends { start: string }> = {
  days: Day<C>[];
  renderCell: (cell: C) => CellView;
};

/** 縦に時刻、横に日付を並べたコマ割りのカレンダー */
export function WeekGrid<C extends { start: string }>({ days, renderCell }: Props<C>) {
  const times = days[0]?.cells.map((c) => formatTime(new Date(c.start))) ?? [];

  return (
    <div className="panel overflow-x-auto">
      <div
        className="grid min-w-[680px]"
        style={{ gridTemplateColumns: `3.2rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="border-b-[3px] border-ink" />
        {days.map((day) => (
          <div
            key={day.date}
            className={`border-b-[3px] border-l-2 border-ink py-2 text-center text-sm font-black ${weekendColor(day.date)}`}
          >
            {formatDayLabel(day.date)}
          </div>
        ))}

        {times.map((time, row) => (
          <Row key={time} time={time} row={row} days={days} renderCell={renderCell} />
        ))}
      </div>
    </div>
  );
}

function Row<C extends { start: string }>({
  time,
  row,
  days,
  renderCell,
}: { time: string; row: number } & Props<C>) {
  const onHour = time.endsWith(":00");
  const lineClass = onHour ? "border-t-2 border-ink/40" : "border-t border-dashed border-ink/20";

  return (
    <>
      <div className={`pr-1 text-right text-[11px] leading-none text-muted ${lineClass}`}>
        {onHour && <span className="relative -top-[0.45em] bg-card px-0.5">{time}</span>}
      </div>
      {days.map((day) => {
        const view = renderCell(day.cells[row]);
        const prevLabel = row > 0 ? renderCell(day.cells[row - 1]).label : undefined;
        const showLabel = view.label && view.label !== prevLabel;
        return (
          <button
            key={day.date}
            type="button"
            disabled={!view.onClick}
            onClick={view.onClick}
            title={view.title}
            className={`relative h-8 border-l-2 border-ink text-left disabled:cursor-default ${lineClass} ${view.className}`}
          >
            {showLabel && (
              <span className="absolute top-0.5 left-1 right-1 truncate text-[11px] font-bold">
                {view.label}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function weekendColor(dateKey: string) {
  const { y, m, d } = parseDateKey(dateKey);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (weekday === 0) return "text-pink";
  if (weekday === 6) return "text-[#2f7fb8]";
  return "";
}

/** 前の週・次の週の切り替え */
export function WeekNav({
  fromKey,
  minKey,
  maxKey,
  onChange,
}: {
  fromKey: string;
  minKey?: string;
  maxKey?: string;
  onChange: (key: string) => void;
}) {
  const prev = addDays(fromKey, -7);
  const next = addDays(fromKey, 7);
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        className="btn btn-sm"
        disabled={minKey !== undefined && fromKey <= minKey}
        onClick={() => onChange(minKey && prev < minKey ? minKey : prev)}
      >
        ← 前の週
      </button>
      <span className="text-sm font-black">
        {formatDayLabel(fromKey)} 〜 {formatDayLabel(addDays(fromKey, 6))}
      </span>
      <button
        type="button"
        className="btn btn-sm"
        disabled={maxKey !== undefined && next > maxKey}
        onClick={() => onChange(next)}
      >
        次の週 →
      </button>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.label} className="tag">
          <span className={`inline-block h-3 w-3 rounded-sm border-2 border-ink ${item.className}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
