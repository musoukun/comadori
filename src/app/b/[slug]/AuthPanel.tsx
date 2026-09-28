"use client";

import { useState } from "react";
import { ColorPicker } from "@/components/ColorPicker";
import { GUESTS } from "@/config/guests";
import { loginAction, registerAction } from "./actions";

type Mode = "login" | "register";

/** 相手のログインと、はじめての人の登録 */
export function AuthPanel({ slug, takenColors }: { slug: string; takenColors: string[] }) {
  const [mode, setMode] = useState<Mode>("login");
  const [colorId, setColorId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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
      onClick={() => {
        setMode(value);
        setMessage(null);
      }}
    >
      {label}
    </button>
  );

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
    </div>
  );
}
