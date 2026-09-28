"use client";

import { useEffect, useState } from "react";
import { ColorPicker } from "@/components/ColorPicker";
import { DurationSelect } from "@/components/DurationSelect";
import { Legend, WeekGrid, WeekNav, type CellView } from "@/components/WeekGrid";
import { useWeek } from "@/components/useWeek";
import { findColor } from "@/config/colors";
import { GUESTS } from "@/config/guests";
import { SCHEDULING } from "@/config/scheduling";
import type { Day, GuestCell } from "@/features/availability/types";
import type { Hold } from "@/features/booking/booking";
import { addDays, formatRange, formatTime } from "@/lib/time";
import {
  cancelBookingAction,
  changeColorAction,
  confirmHoldAction,
  guestLogoutAction,
  holdSlotAction,
  releaseHoldAction,
} from "./actions";

type WeekResponse = { days: Day<GuestCell>[]; myHold: Hold | null };
type Me = { name: string; colorId: string; canNameEvent: boolean };

export function GuestBoard({
  slug,
  todayKey,
  me,
  takenColors,
}: {
  slug: string;
  todayKey: string;
  me: Me;
  takenColors: string[];
}) {
  const [fromKey, setFromKey] = useState(todayKey);
  const [minutes, setMinutes] = useState<number>(SCHEDULING.defaultMeetingMinutes);
  const { data, error, reload } = useWeek<WeekResponse>(
    `/api/public/${slug}/week?from=${fromKey}&minutes=${minutes}`,
    SCHEDULING.pollSeconds,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ start: string; end: string } | null>(null);
  const color = findColor(me.colorId);
  const hold = data?.myHold ?? null;

  const selectSlot = async (cell: GuestCell) => {
    setBusy(true);
    setMessage(null);
    const result = await holdSlotAction(slug, cell.start, minutes);
    if (!result.ok) setMessage(result.message);
    await reload();
    setBusy(false);
  };

  const cancelHold = async () => {
    if (hold) await releaseHoldAction(slug, hold.id);
    reload();
  };

  const cancelBooking = async (cell: GuestCell) => {
    if (!confirm(`${formatTime(new Date(cell.start))} からの予約を取り消しますか？`)) return;
    setBusy(true);
    setMessage(null);
    const result = await cancelBookingAction(slug, cell.bookingId!);
    setMessage(result.ok ? "予約を取り消しました。" : result.message);
    await reload();
    setBusy(false);
  };

  const onExpired = () => {
    setMessage("仮押さえの期限が切れました。もう一度時間を選んでください。");
    reload();
  };

  if (done) {
    return (
      <div className="panel mx-auto max-w-md space-y-4 p-6 text-center">
        <h2 className="font-display text-2xl">予約が確定しました</h2>
        <p className="text-lg font-bold">{formatRange(new Date(done.start), new Date(done.end))}</p>
        <button type="button" className="btn" onClick={() => setDone(null)}>
          カレンダーに戻る
        </button>
      </div>
    );
  }

  const mineStyle = { backgroundColor: color.hex, color: color.text };
  const renderCell = (cell: GuestCell): CellView => {
    switch (cell.state) {
      case "mine": {
        const cancellable = !busy && cell.bookingId !== undefined && new Date(cell.start) > new Date();
        return {
          className: cancellable ? "cursor-pointer hover:opacity-80" : "",
          style: mineStyle,
          label: "自分の予約",
          title: cancellable ? "クリックで取り消す" : undefined,
          onClick: cancellable ? () => cancelBooking(cell) : undefined,
        };
      }
      case "myHold":
        return { className: "hatch", style: mineStyle, label: "選択中" };
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
      <MeBar slug={slug} me={me} takenColors={takenColors} />
      <DurationSelect label="予約の長さ" value={minutes} onChange={setMinutes} />
      <WeekNav
        fromKey={fromKey}
        minKey={todayKey}
        maxKey={addDays(todayKey, SCHEDULING.daysAhead)}
        onChange={setFromKey}
      />
      <Legend
        items={[
          { label: "空き", className: "bg-card" },
          { label: "自分の予約", className: "", style: { backgroundColor: color.hex } },
          { label: "予定あり", className: "bg-slate" },
          { label: "他の方が手続き中", className: "bg-yellow/50 hatch" },
          { label: "受付時間外", className: "bg-[var(--closed)] hatch" },
        ]}
      />
      {message && <p className="panel bg-yellow px-4 py-2 font-bold">{message}</p>}
      {error && <p className="panel bg-pink px-4 py-2 font-bold">{error}</p>}
      {data ? <WeekGrid days={data.days} renderCell={renderCell} /> : <p className="font-bold">読み込み中…</p>}
      {hold && (
        <HoldPanel
          key={hold.id}
          slug={slug}
          hold={hold}
          canNameEvent={me.canNameEvent}
          onCancel={cancelHold}
          onExpired={onExpired}
          onConfirmed={(r) => {
            setDone(r);
            reload();
          }}
          onError={(m) => {
            setMessage(m);
            reload();
          }}
        />
      )}
    </div>
  );
}

/** ログイン中の名前と色。色の変更とログアウト */
function MeBar({ slug, me, takenColors }: { slug: string; me: Me; takenColors: string[] }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const color = findColor(me.colorId);

  const change = async (colorId: string) => {
    const result = await changeColorAction(slug, colorId);
    if (result.ok) setEditing(false);
    else setMessage(result.message);
  };

  return (
    <div className="panel space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-ink" style={{ backgroundColor: color.hex }} />
        <span className="font-black">{me.name} さん</span>
        <button type="button" className="btn btn-sm" onClick={() => setEditing(!editing)}>
          色を変える
        </button>
        <form action={() => guestLogoutAction(slug)} className="ml-auto">
          <button type="submit" className="btn btn-sm">
            ログアウト
          </button>
        </form>
      </div>
      {editing && <ColorPicker value={me.colorId} taken={takenColors} onChange={change} />}
      {message && <p className="font-bold text-[#c0392b]">{message}</p>}
    </div>
  );
}

function HoldPanel({
  slug,
  hold,
  canNameEvent,
  onCancel,
  onExpired,
  onConfirmed,
  onError,
}: {
  slug: string;
  hold: Hold;
  canNameEvent: boolean;
  onCancel: () => void;
  onExpired: () => void;
  onConfirmed: (r: { start: string; end: string }) => void;
  onError: (message: string) => void;
}) {
  const remaining = useRemainingSeconds(hold.expiresAt, onExpired);
  const [sending, setSending] = useState(false);

  const submit = async (form: FormData) => {
    setSending(true);
    const result = await confirmHoldAction(slug, hold.id, {
      note: String(form.get("note") ?? ""),
      title: String(form.get("title") ?? ""),
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
        {canNameEvent && (
          <input
            name="title"
            maxLength={GUESTS.maxTextLength}
            placeholder="予定名（任意。相手のカレンダーにこの名前で入ります）"
            className="input"
          />
        )}
        <textarea name="note" rows={2} placeholder="用件（任意）" className="input" />
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
