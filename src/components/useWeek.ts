"use client";

import { useCallback, useEffect, useState } from "react";

/** 週表示のデータを読み込み、一定間隔とタブに戻ったときに取り直す */
export function useWeek<T>(url: string, pollSeconds: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? "読み込みに失敗しました。");
        return;
      }
      setData(body);
      setError(null);
    } catch {
      setError("読み込みに失敗しました。");
    }
  }, [url]);

  useEffect(() => {
    // 外部（サーバー）から取ってくる処理なので、effect から呼ぶのが正しい
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const timer = setInterval(reload, pollSeconds * 1000);
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload, pollSeconds]);

  return { data, error, reload };
}
