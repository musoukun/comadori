"use client";

import { useState } from "react";
import { DurationSelect } from "@/components/DurationSelect";
import { Legend, WeekGrid, WeekNav, type CellView } from "@/components/WeekGrid";
import { useWeek } from "@/components/useWeek";
import { findColor } from "@/config/colors";
import { SCHEDULING } from "@/config/scheduling";
import type { Day, OwnerCell } from "@/features/availability/types";
import { addBlockAction, removeBlockAction } from "./actions";

// 所有者の画面は、新しい予約が見えれば十分なので取り直しの間隔を長めにする
const OWNER_POLL_SECONDS = 30;

const LEGEND = [
  { label: "空き", className: "bg-card" },
  { label: "Googleの予定", className: "bg-slate" },
  { label: "ブロック", className: "bg-ink" },
  { label: "予約（相手の色）", className: "bg-pink" },
  { label: "仮押さえ中", className: "bg-yellow/50 hatch" },
  { label: "受付時間外", className: "bg-[var(--closed)] hatch" },
];

export function OwnerBoard({ todayKey }: { todayKey: string }) {
  const [fromKey, setFromKey] = useState(todayKey);
  const [blockMinutes, setBlockMinutes] = useState<number>(SCHEDULING.defaultBlockMinutes);
  const { data, error, reload } = useWeek<{ days: Day<OwnerCell>[] }>(
    `/api/me/week?from=${fromKey}&minutes=${blockMinutes}`,
    OWNER_POLL_SECONDS,
  );
  const [saving, setSaving] = useState(false);

  const mutate = async (fn: () => Promise<void>) => {
    setSaving(true);
    await fn();
    await reload();
    setSaving(false);
  };

  const renderCell = (cell: OwnerCell): CellView => {
    const canBlock = !saving && new Date(cell.start) > new Date();
    switch (cell.state) {
      case "google":
        return { className: "bg-slate", label: "Google" };
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
          className: `${cell.state === "closed" ? "bg-[var(--closed)] hatch" : "bg-card"} ${canBlock ? "cursor-pointer hover:bg-ink/20" : ""}`,
          title: canBlock ? "クリックでブロックする" : undefined,
          onClick: canBlock ? () => mutate(() => addBlockAction(cell.start, blockMinutes)) : undefined,
        };
    }
  };

  return (
    <div className="space-y-4">
      <WeekNav fromKey={fromKey} onChange={setFromKey} />
      <Legend items={LEGEND} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <DurationSelect label="ブロックの長さ" value={blockMinutes} onChange={setBlockMinutes} />
        <p className="text-sm text-muted">
          空いているコマをクリックするとブロック、ブロックをクリックすると解除します。予約にマウスを乗せると相手の名前が出ます。
        </p>
      </div>
      {error && <p className="panel bg-pink px-4 py-2 font-bold">{error}</p>}
      {data ? <WeekGrid days={data.days} renderCell={renderCell} /> : <p className="font-bold">読み込み中…</p>}
    </div>
  );
}
