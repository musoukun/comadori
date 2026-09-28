"use client";

import { useState } from "react";
import { Legend, WeekGrid, WeekNav, type CellView, type RangeSelection } from "@/components/WeekGrid";
import { useWeek } from "@/components/useWeek";
import { findColor } from "@/config/colors";
import { SCHEDULING } from "@/config/scheduling";
import type { Day, OwnerCell } from "@/features/availability/types";
import { addBlockAction, removeBlockAction } from "./actions";
import { DayEndSetting } from "./DayEndSetting";

// 所有者の画面は、新しい予約が見えれば十分なので取り直しの間隔を長めにする
const OWNER_POLL_SECONDS = 30;

const LEGEND = [
  { label: "空き", className: "bg-card" },
  { label: "自分のカレンダーの予定", className: "bg-slate" },
  { label: "ブロック", className: "bg-ink" },
  { label: "予約（相手の色）", className: "bg-pink" },
  { label: "仮押さえ中", className: "bg-yellow/50 hatch" },
  { label: "受付時間外", className: "bg-[var(--closed)] hatch" },
];

export function OwnerBoard({ todayKey, dayEndMinutes }: { todayKey: string; dayEndMinutes: number }) {
  const [fromKey, setFromKey] = useState(todayKey);
  const { data, error, reload } = useWeek<{ days: Day<OwnerCell>[] }>(
    `/api/me/week?from=${fromKey}`,
    OWNER_POLL_SECONDS,
  );
  const [saving, setSaving] = useState(false);

  const mutate = async (fn: () => Promise<void>) => {
    setSaving(true);
    await fn();
    await reload();
    setSaving(false);
  };

  const canBlock = (cell: OwnerCell) =>
    !saving && (cell.state === "free" || cell.state === "closed") && new Date(cell.start) > new Date();

  const renderCell = (cell: OwnerCell): CellView => {
    switch (cell.state) {
      case "calendar":
        return { className: "bg-slate", label: "予定" };
      case "booked":
      case "held": {
        const color = findColor(cell.colorId ?? "");
        return {
          className: cell.state === "held" ? "hatch" : "",
          style: {
            backgroundColor: cell.state === "held" ? `${color.hex}66` : color.hex,
            color: cell.state === "held" ? "var(--ink)" : color.text,
          },
          label: cell.state === "held" ? `仮押さえ中（${cell.title}）` : cell.title,
          title: cell.guestName,
        };
      }
      case "block":
        return {
          className: "bg-ink text-card cursor-pointer hover:opacity-80",
          label: "ブロック",
          title: "クリックでブロックを外す",
          onClick: saving ? undefined : () => mutate(() => removeBlockAction(cell.blockId!)),
        };
      case "free":
      case "closed":
        return {
          className: `${cell.state === "closed" ? "bg-[var(--closed)] hatch" : "bg-card"} ${canBlock(cell) ? "cursor-pointer hover:bg-ink/20" : ""}`,
          title: canBlock(cell) ? "クリック、またはドラッグでブロックする" : undefined,
        };
    }
  };

  // ドラッグした範囲をまとめてブロックする。クリックだけなら defaultBlockMinutes 分
  const selection: RangeSelection<OwnerCell> = {
    canSelect: canBlock,
    clickCells: SCHEDULING.defaultBlockMinutes / SCHEDULING.slotMinutes,
    maxCells: Number.MAX_SAFE_INTEGER,
    previewClassName: "bg-ink/60 hatch text-card",
    onSelect: (cells) =>
      mutate(() => addBlockAction(cells[0].start, cells.length * SCHEDULING.slotMinutes)),
  };

  return (
    <div className="space-y-4">
      <DayEndSetting initialMinutes={dayEndMinutes} onSaved={reload} />
      <WeekNav fromKey={fromKey} onChange={setFromKey} />
      <Legend items={LEGEND} />
      <p className="text-sm text-muted">
        空いているコマをクリック（{SCHEDULING.defaultBlockMinutes}分）またはドラッグするとブロック、ブロックをクリックすると解除します。予約にマウスを乗せると相手の名前が出ます。
      </p>
      {error && <p className="panel bg-pink px-4 py-2 font-bold">{error}</p>}
      {data ? (
        <WeekGrid days={data.days} renderCell={renderCell} selection={selection} />
      ) : (
        <p className="font-bold">読み込み中…</p>
      )}
    </div>
  );
}
