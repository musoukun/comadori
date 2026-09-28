"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-3">
      <input readOnly value={url} className="input font-mono text-sm" onFocus={(e) => e.target.select()} />
      <button type="button" className="btn btn-cyan shrink-0" onClick={copy}>
        {copied ? "コピーしました" : "コピー"}
      </button>
    </div>
  );
}
