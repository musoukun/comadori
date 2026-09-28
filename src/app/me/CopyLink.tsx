"use client";

import { useState } from "react";
import { copyText } from "@/lib/copyText";

export function CopyLink({ url }: { url: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    setStatus((await copyText(url)) ? "copied" : "failed");
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
    <div className="flex gap-3">
      <input readOnly value={url} className="input font-mono text-sm" onFocus={(e) => e.target.select()} />
      <button type="button" className="btn btn-cyan shrink-0" onClick={copy}>
        {status === "copied" ? "コピーしました" : status === "failed" ? "欄を選んでコピーしてください" : "コピー"}
      </button>
    </div>
  );
}
