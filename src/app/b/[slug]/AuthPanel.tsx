"use client";

import { useState } from "react";
import { ColorPicker } from "@/components/ColorPicker";
import { GUESTS } from "@/config/guests";
import { loginAction, registerAction, requestPasswordResetAction } from "./actions";

type Mode = "login" | "register" | "forgot";

/** 相手のログインと、はじめての人の登録 */
export function AuthPanel({ slug, takenColors }: { slug: string; takenColors: string[] }) {
  const [mode, setMode] = useState<Mode>("login");
  const [colorId, setColorId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const switchMode = (value: Mode) => {
    setMode(value);
    setMessage(null);
    setNotice(null);
  };

  const submitForgot = async (form: FormData) => {
    setSending(true);
    setMessage(null);
    const result = await requestPasswordResetAction(slug, String(form.get("email") ?? ""));
    setSending(false);
    if (result.ok) {
      setNotice("登録されているメールアドレスなら、パスワード再設定のリンクを送りました。メールを確認してください。");
    } else {
      setMessage(result.message);
    }
  };

  const submit = async (form: FormData) => {
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    if (mode === "register" && !colorId) {
      setMessage("色を選んでください。");
      return;
    }
    setSending(true);
    setMessage(null);
    const result =
      mode === "login"
        ? await loginAction(slug, email, password)
        : await registerAction(slug, { name: String(form.get("name") ?? ""), email, password, colorId: colorId! });
    setSending(false);
    if (!result.ok) setMessage(result.message);
  };

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      className={`btn flex-1 ${mode === value ? "btn-yellow" : ""}`}
      onClick={() => switchMode(value)}
    >
      {label}
    </button>
  );

  if (mode === "forgot") {
    return (
      <div className="panel mx-auto max-w-md space-y-4 p-6">
        <h2 className="font-black">パスワードの再設定</h2>
        <p className="text-sm text-muted">登録したメールアドレスに、新しいパスワードを設定するリンクを送ります。</p>
        {notice ? (
          <p className="font-bold">{notice}</p>
        ) : (
          <form action={submitForgot} className="space-y-3">
            <input name="email" type="email" required autoComplete="email" placeholder="メールアドレス" className="input" />
            {message && <p className="font-bold text-[#c0392b]">{message}</p>}
            <button type="submit" className="btn btn-yellow w-full" disabled={sending}>
              リンクを送る
            </button>
          </form>
        )}
        <button type="button" className="btn btn-sm" onClick={() => switchMode("login")}>
          ログインに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="panel mx-auto max-w-md space-y-5 p-6">
      <div className="flex gap-3">
        {tab("login", "ログイン")}
        {tab("register", "はじめての方")}
      </div>

      <form action={submit} className="space-y-3">
        {mode === "register" && (
          <label className="block space-y-1">
            <span className="text-sm font-bold">お名前</span>
            <input name="name" required maxLength={GUESTS.maxTextLength} className="input" />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-bold">メールアドレス</span>
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-bold">パスワード</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "register" ? GUESTS.passwordMinLength : undefined}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="input"
          />
          {mode === "register" && (
            <span className="text-xs text-muted">{GUESTS.passwordMinLength}文字以上</span>
          )}
        </label>
        {mode === "register" && (
          <div className="space-y-2">
            <span className="text-sm font-bold">あなたの色（予定を入れたときの色。×は他の方が使用中）</span>
            <ColorPicker value={colorId} taken={takenColors} onChange={setColorId} />
          </div>
        )}
        {message && <p className="font-bold text-[#c0392b]">{message}</p>}
        <button type="submit" className="btn btn-yellow w-full" disabled={sending}>
          {mode === "login" ? "ログイン" : "登録してはじめる"}
        </button>
      </form>
      {mode === "login" && (
        <button type="button" className="text-sm font-bold underline" onClick={() => switchMode("forgot")}>
          パスワードを忘れた方
        </button>
      )}
    </div>
  );
}
