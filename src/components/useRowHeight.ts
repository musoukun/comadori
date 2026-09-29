"use client";

import { useEffect, useState } from "react";

/** カレンダー1マスの高さ（px）。最大が今までの高さで、最小はその半分 */
export const ROW_HEIGHT = { max: 24, min: 12 } as const;

const STORAGE_KEY = "comadori-row-height";

/** マスの高さ。このブラウザに覚えさせる */
export function useRowHeight() {
  const [height, setHeight] = useState<number>(ROW_HEIGHT.max);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (saved >= ROW_HEIGHT.min && saved <= ROW_HEIGHT.max) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHeight(saved);
      }
    } catch {}
  }, []);

  const update = (value: number) => {
    setHeight(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  };

  return [height, update] as const;
}
