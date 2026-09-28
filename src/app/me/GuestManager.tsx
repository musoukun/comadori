"use client";

import { useState } from "react";
import { findColor } from "@/config/colors";
import { GUESTS } from "@/config/guests";
import { deleteGuestAction, updateMaskTitleAction } from "./actions";

type GuestRow = { id: string; name: string; email: string; colorId: string; maskTitle: string };

/** 登録した相手の一覧。相手ごとにカレンダーに出す予定名を決める */
export function GuestManager({ guests }: { guests: GuestRow[] }) {
  return (
    <section className="panel space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="font-black">登録している相手</h2>
        <p className="text-sm text-muted">
          予約が入ると、ここで決めた予定名で自分のGoogleカレンダーに載ります。相手の名前や用件はGoogleカレンダーに書きません。
        </p>
      </div>
      {guests.length === 0 ? (
        <p className="text-sm font-bold">まだ登録している相手はいません。共有リンクを送ると、相手がそこから登録します。</p>
      ) : (
        <ul className="space-y-3">
          {guests.map((guest) => (
            <GuestItem key={guest.id} guest={guest} />
          ))}
        </ul>
      )}
    </section>
  );
}

function GuestItem({ guest }: { guest: GuestRow }) {
  const color = findColor(guest.colorId);
  const [title, setTitle] = useState(guest.maskTitle);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const result = await updateMaskTitleAction(guest.id, title);
    setSaving(false);
    setMessage(result.ok ? "保存しました" : result.message);
  };

  const remove = async () => {
    if (!confirm(`${guest.name} さんの登録を削除しますか？入っている予約は残ります。`)) return;
    await deleteGuestAction(guest.id);
  };

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border-[3px] border-ink p-3">
      <span
        className="inline-block h-6 w-6 shrink-0 rounded-full border-2 border-ink"
        style={{ backgroundColor: color.hex }}
        title={color.name}
      />
      <div className="min-w-32">
        <p className="font-black">{guest.name}</p>
        <p className="text-xs text-muted">{guest.email}</p>
      </div>
      <label className="flex flex-1 items-center gap-2">
        <span className="shrink-0 text-sm font-bold">予定名</span>
        <input
          value={title}
          maxLength={GUESTS.maxTextLength}
          onChange={(e) => {
            setTitle(e.target.value);
            setMessage(null);
          }}
          placeholder="例: 家庭訪問"
          className="input min-w-28 py-1.5"
        />
      </label>
      <button
        type="button"
        className="btn btn-sm btn-yellow"
        onClick={save}
        disabled={saving || title === guest.maskTitle}
      >
        保存
      </button>
      <button type="button" className="btn btn-sm" onClick={remove}>
        削除
      </button>
      {message && <p className="w-full text-sm font-bold">{message}</p>}
    </li>
  );
}
