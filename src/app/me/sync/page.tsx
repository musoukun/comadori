import Link from "next/link";
import { redirect } from "next/navigation";
import { SYNC } from "@/config/sync";
import { ensureFeedToken } from "@/features/sync/feed";
import { buildGasScript, ensureGasToken } from "@/features/sync/gas";
import { getCurrentOwner } from "@/lib/session";
import { formatDate, formatTime } from "@/lib/time";
import { CopyLink } from "../CopyLink";
import { CopyBlock } from "./CopyBlock";
import { ImportPanel } from "./ImportPanel";
import { RegenerateButton } from "./RegenerateButton";

function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border-[3px] border-ink bg-[#e9f9ef] p-3">
        <p className="font-black">メリット</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {pros.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border-[3px] border-ink bg-[#fdecec] p-3">
        <p className="font-black">デメリット</p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {cons.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const formatDateTime = (date: Date) => `${formatDate(date)} ${formatTime(date)}`;

export default async function SyncPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/");

  const appUrl = process.env.APP_URL ?? "";
  const [feedToken, gasToken] = await Promise.all([ensureFeedToken(owner.id), ensureGasToken(owner.id)]);

  return (
    <main className="mx-auto max-w-[70.4rem] space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">カレンダー連携</h1>
        <Link href="/me" className="btn btn-sm">
          ← 戻る
        </Link>
      </header>

      <p className="font-bold">
        Googleカレンダーとつなぐ手段は2つあります。どちらも「自分の予定を空き状況に反映する」と「入った予約を自分のカレンダーに載せる」の両方ができます。
      </p>

      <section className="panel space-y-4 p-5">
        <h2 className="text-xl font-black">
          手段1 GAS（Google Apps Script）で自動連携 <span className="tag bg-yellow align-middle">おすすめ</span>
        </h2>
        <ProsCons
          pros={[
            `一度設定すれば、${SYNC.gasIntervalMinutes}分ごとに自動で同期される`,
            "予約が自分のカレンダーに直接入り、取り消し・予定名の変更も自動で反映される",
            "自分のアカウントで動くスクリプトなので、Googleの審査が要らない",
            "予定名も取り込むので、自分の画面では予定の中身を確認できる（相手には「予定あり」としか見えない）",
          ]}
          cons={[
            "最初の設定が5ステップほどあり、途中で「確認されていないアプリ」の警告が出る（自分のスクリプトなので進めてよい）",
            `反映まで最大${SYNC.gasIntervalMinutes}分ほどかかる`,
          ]}
        />
        <Link href="/guide/gas" className="btn btn-sm btn-yellow">
          画像つきの手順書を見る
        </Link>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>下の「スクリプトをコピー」を押す</li>
          <li>
            PCのブラウザで{" "}
            <a href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer" className="font-bold underline">
              Apps Script の新しいプロジェクト
            </a>{" "}
            を開く
          </li>
          <li>最初から書いてある中身を全部消して貼り付け、保存する</li>
          <li>上の関数の選択で「setup」を選び、「実行」を押す</li>
          <li>許可の画面で自分のアカウントを選び、「詳細」→「（安全ではないページ）に移動」→「許可」を押す</li>
        </ol>
        <p className="text-sm font-bold">
          {owner.gasSyncedAt ? `最終同期: ${formatDateTime(owner.gasSyncedAt)}` : "まだ同期されていません。"}
        </p>
        <CopyBlock text={buildGasScript(appUrl, gasToken)} />
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted">
            スクリプトには連携の鍵が入っています。人に見せないでください。連携するアカウントを変えるときは、鍵を作り直してから新しいアカウントで設定し直します（
            <Link href="/guide/gas" className="underline">
              手順書
            </Link>
            の最後を参照）。
          </p>
          <RegenerateButton kind="gas" />
        </div>
      </section>

      <section className="panel space-y-5 p-5">
        <h2 className="text-xl font-black">手段2 手動で連携（.ics の取り込み ＋ 購読カレンダー）</h2>
        <ProsCons
          pros={["スクリプトの設定が要らず、ファイルを選ぶだけ・URL を登録するだけで使える", "ファイルはブラウザの中で読み、サーバーには時間と予定名だけを送る（説明や参加者は送らない）"]}
          cons={[
            "自分の予定は、取り込み直すまで反映されない（定期的に手で取り込む必要がある）",
            "予約の反映はGoogleが購読カレンダーを取りに来る間隔しだいで、数時間かかることがある",
          ]}
        />

        <div className="space-y-3">
          <h3 className="font-black">自分の予定を取り込む</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>PCのブラウザでGoogleカレンダーを開き、右上の歯車 →「設定」を開く</li>
            <li>左の「インポート/エクスポート」→「エクスポート」を押す（zip ファイルがダウンロードされる）</li>
            <li>下で zip ファイルをそのまま選び、取り込むカレンダーと期間を選んで「取り込む」を押す</li>
          </ol>
          <p className="text-sm font-bold">
            {owner.busyImportedAt && owner.busyImportedUntil
              ? `前回の反映: ${formatDateTime(owner.busyImportedAt)}（${formatDate(owner.busyImportedUntil)} まで）`
              : "まだ取り込んでいません。"}
          </p>
          <ImportPanel />
        </div>

        <div className="space-y-3">
          <h3 className="font-black">予約を自分のカレンダーに載せる（購読カレンダー）</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>下の URL をコピーする</li>
            <li>PCのブラウザでGoogleカレンダーを開き、左の「他のカレンダー」の「＋」→「URLで追加」を選ぶ</li>
            <li>URL を貼り付けて「カレンダーを追加」を押す</li>
          </ol>
          <CopyLink url={`${appUrl}/api/feed/${feedToken}`} />
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">この URL を知っている人は予約の予定名と時間を見られます。人に教えないでください。</p>
            <RegenerateButton kind="feed" />
          </div>
        </div>
      </section>

      <section className="panel space-y-2 bg-[var(--closed)] p-5">
        <h2 className="font-black">Googleアカウントでの自動連携について</h2>
        <p className="text-sm">
          Googleアカウントでログインするだけで予定を自動で読み書きする連携は、Googleの審査が必要なため、今は対応していません。利用者が増えて人気が出たら検討します。
        </p>
      </section>
    </main>
  );
}
