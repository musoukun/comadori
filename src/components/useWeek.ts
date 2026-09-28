"use client";

import { useCallback, useEffect, useState } from "react";
import type { Day } from "@/features/availability/types";

/** 1週間分のコマを読み込み、一定間隔とタブに戻ったときに取り直す */
export function useWeek<C>(url: string, pollSeconds: number) {
  const [days, setDays] = useState<Day<C>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "読み込みに失敗しました。");
        return;
      }
      setDays(data.days);
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

  return { days, error, reload };
}
