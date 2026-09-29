"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { Day } from "@/features/availability/types";
import { addDays, formatDayLabel, formatTime, parseDateKey } from "@/lib/time";
import { ROW_HEIGHT } from "./useRowHeight";

export type CellView = {
  className: string;
  /** 同じ label が続く間は、先頭のコマにだけ表示する */
  label?: string;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
};

/** Google カレンダーのように、押したコマから引っ張って時間の範囲を選ぶ */
export type RangeSelection<C> = {
  /** このコマを範囲に含められるか */
  canSelect: (cell: C) => boolean;
  /** クリック（スマホではタップ）だけのときに選ぶコマ数 */
  clickCells: number;
  /** 一度に選べる最大のコマ数 */
  maxCells: number;
  /** 選んでいる途中のコマの見た目 */
  previewClassName: string;
  onSelect: (cells: C[]) => void;
};

type Cell = { start: string; end: string };

type Props<C extends Cell> = {
  days: Day<C>[];
  renderCell: (cell: C) => CellView;
  selection?: RangeSelection<C>;
  /** 1マスの高さ（px） */
  rowHeight?: number;
};

type Drag = { day: number; anchor: number; current: number };

/** 押したコマ(anchor)から target に向かって、選べるコマが続くところまでを範囲にする */
function rangeRows<C>(cells: C[], anchor: number, target: number, selection: RangeSelection<C>): [number, number] {
  const step = target >= anchor ? 1 : -1;
  let edge = anchor;
  while (
    edge !== target &&
    Math.abs(edge + step - anchor) < selection.maxCells &&
    cells[edge + step] !== undefined &&
    selection.canSelect(cells[edge + step])
  ) {
    edge += step;
  }
  return step === 1 ? [anchor, edge] : [edge, anchor];
}

function rangeLabel(first: Cell, last: Cell): string {
  const minutes = (new Date(last.end).getTime() - new Date(first.start).getTime()) / 60_000;
  return `${formatTime(new Date(first.start))}〜${formatTime(new Date(last.end))}（${minutes}分）`;
}

/** 縦に時刻、横に日付を並べたコマ割りのカレンダー */
export function WeekGrid<C extends Cell>({ days, renderCell, selection, rowHeight = ROW_HEIGHT.max }: Props<C>) {
  // マスを縮めたときは、マスの中の文字も小さくする
  const labelSize = rowHeight < 18 ? "text-[9px] leading-none" : "text-[11px] leading-tight";
  const times = days[0]?.cells.map((c) => formatTime(new Date(c.start))) ?? [];
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const pointerTypeRef = useRef<string>("mouse");
  const dragging = drag !== null;

  const updateDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const selectRange = (day: number, anchor: number, target: number) => {
    if (!selection) return;
    const cells = days[day].cells;
    const [from, to] = rangeRows(cells, anchor, target, selection);
    selection.onSelect(cells.slice(from, to + 1));
  };

  // ドラッグ中はマウスの下のコマを探して範囲を伸ばし、離したところで確定する
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const current = dragRef.current;
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-day][data-row]");
      if (!current || !el || Number(el.dataset.day) !== current.day) return;
      const row = Number(el.dataset.row);
      if (row !== current.current) updateDrag({ ...current, current: row });
    };
    const onUp = () => {
      const current = dragRef.current;
      updateDrag(null);
      if (!current || !selection) return;
      const target = current.current === current.anchor ? current.anchor + selection.clickCells - 1 : current.current;
      selectRange(current.day, current.anchor, target);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const preview = drag && selection ? rangeRows(days[drag.day].cells, drag.anchor, drag.current, selection) : null;

  const onPointerDown = (e: ReactPointerEvent, day: number, row: number, cell: C) => {
    pointerTypeRef.current = e.pointerType;
    // スマホは指で引っ張るとスクロールとぶつかるので、タップ（onClick）で選ぶ
    if (!selection || e.pointerType === "touch" || e.button !== 0 || !selection.canSelect(cell)) return;
    e.preventDefault();
    updateDrag({ day, anchor: row, current: row });
  };

  return (
    <div className="panel overflow-x-auto">
      <div
        className="grid min-w-[680px] select-none"
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

        {times.map((time, row) => {
          const onHour = time.endsWith(":00");
          const lineClass = onHour
            ? "border-t-2 border-ink/40"
            : time.endsWith(":30")
              ? "border-t border-dashed border-ink/25"
              : "border-t border-dotted border-ink/15";
          return [
            <div key={`t-${time}`} className={`pr-1 text-right text-[11px] leading-none text-muted ${lineClass}`}>
              {onHour && <span className="relative -top-[0.45em] bg-card px-0.5">{time}</span>}
            </div>,
            ...days.map((day, d) => {
              const cell = day.cells[row];
              const selectable = selection?.canSelect(cell) ?? false;
              const inPreview = preview !== null && drag?.day === d && row >= preview[0] && row <= preview[1];
              const base = renderCell(cell);
              const view: CellView = inPreview
                ? {
                    className: selection!.previewClassName,
                    label: row === preview![0] ? rangeLabel(day.cells[preview![0]], day.cells[preview![1]]) : undefined,
                  }
                : base;
              const prevLabel = row > 0 && !inPreview ? renderCell(day.cells[row - 1]).label : undefined;
              const showLabel = view.label && view.label !== prevLabel;
              return (
                <button
                  key={`${day.date}-${time}`}
                  type="button"
                  data-day={d}
                  data-row={row}
                  disabled={!base.onClick && !selectable}
                  onPointerDown={(e) => onPointerDown(e, d, row, cell)}
                  onClick={() => {
                    if (base.onClick) base.onClick();
                    else if (selectable && pointerTypeRef.current === "touch") {
                      selectRange(d, row, row + selection!.clickCells - 1);
                    }
                  }}
                  title={view.title}
                  style={{ ...view.style, height: rowHeight }}
                  className={`relative border-l-2 border-ink text-left disabled:cursor-default ${lineClass} ${view.className}`}
                >
                  {showLabel && (
                    <span className={`absolute top-0.5 left-1 right-1 z-10 truncate font-bold ${labelSize}`}>
                      {view.label}
                    </span>
                  )}
                </button>
              );
            }),
          ];
        })}
      </div>
    </div>
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

export function Legend({
  items,
}: {
  items: { label: string; className: string; style?: CSSProperties }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.label} className="tag">
          <span
            className={`inline-block h-3 w-3 rounded-sm border-2 border-ink ${item.className}`}
            style={item.style}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/** マスの高さを、今までの高さから半分まで縮めるスライダー */
export function RowHeightSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const percent = Math.round((value / ROW_HEIGHT.max) * 100);
  return (
    <label className="flex items-center gap-2 text-sm font-bold">
      マスの高さ
      <input
        type="range"
        min={ROW_HEIGHT.min}
        max={ROW_HEIGHT.max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 cursor-pointer accent-[var(--ink)]"
      />
      <span className="w-10 text-right tabular-nums">{percent}%</span>
    </label>
  );
}
