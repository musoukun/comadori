"use client";

import { useState } from "react";
import { Legend, WeekGrid, WeekNav, type CellView } from "@/components/WeekGrid";
import { useWeek } from "@/components/useWeek";
import type { OwnerCell } from "@/features/availability/types";
import { addBlockAction, removeBlockAction } from "./actions";

// 所有者の画面は、新しい予約が見えれば十分なので取り直しの間隔を長めにする
const OWNER_POLL_SECONDS = 30;

const LEGEND = [
  { label: "空き", className: "bg-card" },
  { label: "Googleの予定", className: "bg-slate" },
  { label: "ブロック", className: "bg-ink" },
  { label: "予約", className: "bg-pink" },
  { label: "仮押さえ中", className: "bg-yellow/50 hatch" },
  { label: "受付時間外", className: "bg-[var(--closed)] hatch" },
];

export function OwnerBoard({ todayKey }: { todayKey: string }) {
  const [fromKey, setFromKey] = useState(todayKey);
  const { days, error, reload } = useWeek<OwnerCell>(`/api/me/week?from=${fromKey}`, OWNER_POLL_SECONDS);
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
        return { className: "bg-pink", label: cell.guestName ?? "予約" };
      case "held":
        return { className: "bg-yellow/50 hatch", label: "仮押さえ中" };
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
          onClick: canBlock ? () => mutate(() => addBlockAction(cell.start)) : undefined,
        };
    }
  };

  return (
    <div className="space-y-4">
      <WeekNav fromKey={fromKey} onChange={setFromKey} />
      <Legend items={LEGEND} />
      <p className="text-sm text-muted">
        空いているコマをクリックするとブロック、ブロックをクリックすると解除します。
      </p>
      {error && <p className="panel bg-pink px-4 py-2 font-bold">{error}</p>}
      {days ? <WeekGrid days={days} renderCell={renderCell} /> : <p className="font-bold">読み込み中…</p>}
    </div>
  );
}
