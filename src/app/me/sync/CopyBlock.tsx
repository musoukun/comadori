"use client";

import { useState } from "react";
import { copyText } from "@/lib/copyText";

/** 複数行のテキスト（スクリプト）をコピーする */
export function CopyBlock({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    setStatus((await copyText(text)) ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
    <div className="space-y-2">
      <button type="button" className="btn btn-cyan" onClick={copy}>
        {status === "copied" ? "コピーしました" : "スクリプトをコピー"}
      </button>
      {status === "failed" && (
        <p className="text-sm font-bold text-[#c0392b]">
          コピーできませんでした。下の欄をクリックして全部選び、Ctrl+C でコピーしてください。
        </p>
      )}
      <textarea readOnly value={text} rows={8} className="input font-mono text-xs" onFocus={(e) => e.target.select()} />
    </div>
  );
}
