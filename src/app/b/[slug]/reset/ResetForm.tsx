"use client";

import Link from "next/link";
import { useState } from "react";
import { GUESTS } from "@/config/guests";
import { resetPasswordAction } from "../actions";

export function ResetForm({ slug, token }: { slug: string; token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (form: FormData) => {
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setMessage("確認用のパスワードが一致しません。");
      return;
    }
    setSending(true);
    setMessage(null);
    const result = await resetPasswordAction(slug, token, password);
    setSending(false);
    if (result.ok) setDone(true);
    else setMessage(result.message);
  };

  if (done) {
    return (
      <div className="panel mx-auto max-w-md space-y-4 p-6">
        <h1 className="font-black">パスワードを変更しました</h1>
        <p className="text-sm">新しいパスワードでログインしてください。</p>
        <Link href={`/b/${slug}`} className="btn btn-yellow">
          ログイン画面へ
        </Link>
      </div>
    );
  }

  return (
    <form action={submit} className="panel mx-auto max-w-md space-y-3 p-6">
      <h1 className="font-black">新しいパスワードを設定</h1>
      <label className="block space-y-1">
        <span className="text-sm font-bold">新しいパスワード</span>
        <input
          name="password"
          type="password"
          required
          minLength={GUESTS.passwordMinLength}
          autoComplete="new-password"
          className="input"
        />
        <span className="text-xs text-muted">{GUESTS.passwordMinLength}文字以上</span>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold">確認のためもう一度</span>
        <input name="confirm" type="password" required autoComplete="new-password" className="input" />
      </label>
      {message && <p className="font-bold text-[#c0392b]">{message}</p>}
      <button type="submit" className="btn btn-yellow w-full" disabled={sending}>
        変更する
      </button>
    </form>
  );
}
