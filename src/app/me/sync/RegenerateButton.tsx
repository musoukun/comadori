"use client";

import { regenerateFeedAction, regenerateGasAction } from "./actions";

/** 鍵を作り直すボタン。購読 URL 用と GAS 用で使う */
export function RegenerateButton({ kind }: { kind: "feed" | "gas" }) {
  const regenerate = async () => {
    const warning =
      kind === "feed"
        ? "URLを作り直しますか？今の URL は使えなくなり、Googleカレンダーへの登録もやり直しになります。"
        : "鍵を作り直しますか？貼り付け済みのスクリプトは動かなくなり、新しいスクリプトの貼り直しが必要になります。";
    if (!confirm(warning)) return;
    await (kind === "feed" ? regenerateFeedAction() : regenerateGasAction());
  };
  return (
    <button type="button" className="btn btn-sm" onClick={regenerate}>
      {kind === "feed" ? "URLを作り直す" : "鍵を作り直す"}
    </button>
  );
}
