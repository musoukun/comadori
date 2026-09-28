"use client";

import { useEffect, useState } from "react";
import { Legend, WeekGrid, WeekNav, type CellView } from "@/components/WeekGrid";
import { useWeek } from "@/components/useWeek";
import { SCHEDULING } from "@/config/scheduling";
import type { GuestCell } from "@/features/availability/types";
import { addDays, formatRange } from "@/lib/time";
import { confirmHoldAction, holdSlotAction, releaseHoldAction } from "./actions";

type Hold = { id: string; token: string; start: string; end: string; expiresAt: string };

const LEGEND = [
  { label: "空き", className: "bg-card" },
  { label: "予定あり", className: "bg-slate" },
  { label: "他の方が手続き中", className: "bg-yellow/50 hatch" },
  { label: "選択中", className: "bg-pink" },
  { label: "受付時間外", className: "bg-[var(--closed)] hatch" },
];

export function GuestBoard({ slug, todayKey }: { slug: string; todayKey: string }) {
  const [fromKey, setFromKey] = useState(todayKey);
  const { days, error, reload } = useWeek<GuestCell>(
    `/api/public/${slug}/week?from=${fromKey}`,
    SCHEDULING.pollSeconds,
  );
  const [hold, setHold] = useStoredHold(slug);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ start: string; end: string } | null>(null);

  const selectSlot = async (cell: GuestCell) => {
    setBusy(true);
    setMessage(null);
    if (hold) await releaseHoldAction(hold.id, hold.token);
    const result = await holdSlotAction(slug, cell.start);
    if (result.ok) {
      setHold({ id: result.id, token: result.token, start: result.start, end: result.end, expiresAt: result.expiresAt });
    } else {
      setHold(null);
      setMessage(result.message);
    }
    await reload();
    setBusy(false);
  };

  const cancelHold = async () => {
    if (hold) await releaseHoldAction(hold.id, hold.token);
    setHold(null);
    reload();
  };

  const onExpired = () => {
    setHold(null);
    setMessage("仮押さえの期限が切れました。もう一度時間を選んでください。");
    reload();
  };

  if (done) {
    return (
      <div className="panel mx-auto max-w-md p-6 text-center">
        <h2 className="font-display text-2xl">予約が確定しました</h2>
        <p className="mt-4 text-lg font-bold">{formatRange(new Date(done.start), new Date(done.end))}</p>
        <p className="mt-4 text-sm text-muted">このページは閉じて大丈夫です。</p>
      </div>
    );
  }

  const isMine = (cell: GuestCell) => hold !== null && cell.start >= hold.start && cell.start < hold.end;

  const renderCell = (cell: GuestCell): CellView => {
    if (isMine(cell)) return { className: "bg-pink", label: "選択中" };
    switch (cell.state) {
      case "busy":
        return { className: "bg-slate", label: "予定あり" };
      case "held":
        return { className: "bg-yellow/50 hatch", label: "手続き中" };
      case "closed":
        return { className: "bg-[var(--closed)] hatch" };
      case "free":
        return cell.bookable && !busy
          ? {
              className: "bg-card hover:bg-yellow cursor-pointer",
              onClick: () => selectSlot(cell),
              title: "この時間から予約する",
            }
          : { className: "bg-card" };
    }
  };

  return (
    <div className="space-y-4 pb-72">
      <WeekNav
        fromKey={fromKey}
        minKey={todayKey}
        maxKey={addDays(todayKey, SCHEDULING.daysAhead)}
        onChange={setFromKey}
      />
      <Legend items={LEGEND} />
      {message && <p className="panel bg-yellow px-4 py-2 font-bold">{message}</p>}
      {error && <p className="panel bg-pink px-4 py-2 font-bold">{error}</p>}
      {days ? <WeekGrid days={days} renderCell={renderCell} /> : <p className="font-bold">読み込み中…</p>}
      {hold && (
        <HoldPanel
          hold={hold}
          onCancel={cancelHold}
          onExpired={onExpired}
          onConfirmed={(r) => {
            setHold(null);
            setDone(r);
          }}
          onError={(m) => {
            setHold(null);
            setMessage(m);
            reload();
          }}
        />
      )}
    </div>
  );
}

function HoldPanel({
  hold,
  onCancel,
  onExpired,
  onConfirmed,
  onError,
}: {
  hold: Hold;
  onCancel: () => void;
  onExpired: () => void;
  onConfirmed: (r: { start: string; end: string }) => void;
  onError: (message: string) => void;
}) {
  const remaining = useRemainingSeconds(hold.expiresAt, onExpired);
  const [sending, setSending] = useState(false);

  const submit = async (form: FormData) => {
    setSending(true);
    const result = await confirmHoldAction(hold.id, hold.token, {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      note: String(form.get("note") ?? ""),
    });
    setSending(false);
    if (result.ok) onConfirmed(result);
    else onError(result.message);
  };

  const urgent = remaining <= 60;
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 p-4">
      <form action={submit} className="panel mx-auto max-w-lg space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-black">{formatRange(new Date(hold.start), new Date(hold.end))}</p>
          <span className={`tag ${urgent ? "bg-pink" : "bg-yellow"}`}>
            仮押さえ中 残り {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </span>
        </div>
        <input name="name" required placeholder="お名前（必須）" className="input" />
        <input name="email" type="email" placeholder="メールアドレス" className="input" />
        <textarea name="note" rows={2} placeholder="用件" className="input" />
        <div className="flex justify-end gap-3">
          <button type="button" className="btn" onClick={onCancel} disabled={sending}>
            やめる
          </button>
          <button type="submit" className="btn btn-yellow" disabled={sending}>
            予約を確定する
          </button>
        </div>
      </form>
    </div>
  );
}

/** 期限までの残り秒数。0 になったら onExpired を1回呼ぶ */
function useRemainingSeconds(expiresAt: string, onExpired: () => void) {
  const calc = () => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(calc);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = calc();
      setRemaining(next);
      if (next === 0) {
        clearInterval(timer);
        onExpired();
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return remaining;
}

/** 再読み込みしても仮押さえを失わないよう、タブの保存領域に置く */
function useStoredHold(slug: string) {
  const key = `comadori-hold-${slug}`;
  const [hold, setHoldState] = useState<Hold | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      const parsed = saved ? (JSON.parse(saved) as Hold) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (parsed && new Date(parsed.expiresAt) > new Date()) setHoldState(parsed);
    } catch {}
  }, [key]);

  const setHold = (next: Hold | null) => {
    setHoldState(next);
    try {
      if (next) sessionStorage.setItem(key, JSON.stringify(next));
      else sessionStorage.removeItem(key);
    } catch {}
  };

  return [hold, setHold] as const;
}
