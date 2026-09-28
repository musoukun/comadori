import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SYNC } from "@/config/sync";

export const metadata: Metadata = { title: "GAS 連携の手順 | コマドリ" };

// 画像は public/guide/gas に置いた注釈つきのスクリーンショット（アカウント情報と鍵は隠してある）
const STEPS = [
  {
    image: "step1.png",
    height: 1052,
    title: "スクリプトをコピーする",
    body: "コマドリの「カレンダー連携」ページを開き、手段1の「スクリプトをコピー」を押します。",
  },
  {
    image: "step2.png",
    height: 1052,
    title: "Apps Script の新しいプロジェクトに貼り付ける",
    body: "PCのブラウザで Apps Script（script.google.com）の新しいプロジェクトを開きます。最初から入っている中身を Ctrl+A で全部選んで消し、Ctrl+V で貼り付けます。",
  },
  {
    image: "step3.png",
    height: 1110,
    title: "保存する",
    body: "保存ボタン（または Ctrl+S）を押します。「変更が保存されていません」の表示が消えれば保存できています。",
  },
  {
    image: "step4.png",
    height: 1110,
    title: "setup を実行する",
    body: "関数の選択が「setup」になっていることを確かめて、「実行」を押します。",
  },
  {
    image: "step5.png",
    height: 1052,
    title: "権限を確認する",
    body: "「承認が必要です」と出たら「権限を確認」を押し、自分の Google アカウントを選びます。「このアプリは Google で確認されていません」という画面が出たときは、左下の「詳細」→「（安全ではないページ）に移動」を押します。自分で作った自分用のスクリプトなので、進めて大丈夫です。",
  },
  {
    image: "step6.png",
    height: 1110,
    title: "許可する",
    body: "カレンダーの表示・編集、外部サービスへの接続、自分がいないときの実行の3つを確認して「許可」を押します。",
  },
  {
    image: "step7.png",
    height: 1052,
    title: "実行ログで成功を確かめる",
    body: "画面下の実行ログに「コマドリとの連携を始めました。」と「実行完了」が出れば、設定は完了です。",
  },
  {
    image: "step8.png",
    height: 1052,
    title: "コマドリで最終同期を確かめる",
    body: `コマドリの「カレンダー連携」ページに「最終同期」の時刻が出ていれば連携できています。以降は ${SYNC.gasIntervalMinutes} 分ごとに自動で同期されます。`,
  },
];

export default function GasGuidePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header className="space-y-3">
        <p className="font-display text-xl">コマドリ</p>
        <h1 className="text-2xl font-black">GAS（Google Apps Script）で自動連携する手順</h1>
        <p className="text-sm text-muted">
          自分の Google アカウントでスクリプトを動かし、予定の空き状況と予約をコマドリと自動で同期します。作業は5分ほどです。
        </p>
        <Link href="/me/sync" className="btn btn-sm">
          カレンダー連携ページへ
        </Link>
      </header>

      <ol className="space-y-10">
        {STEPS.map((step, i) => (
          <li key={step.image} className="panel space-y-4 p-5">
            <h2 className="text-xl font-black">
              <span className="tag mr-2 bg-yellow align-middle">手順 {i + 1}</span>
              {step.title}
            </h2>
            <p>{step.body}</p>
            <Image
              src={`/guide/gas/${step.image}`}
              alt={`手順${i + 1}: ${step.title}`}
              width={966}
              height={step.height}
              className="h-auto w-full rounded-lg border-2 border-ink"
            />
          </li>
        ))}
      </ol>

      <section className="panel space-y-3 p-5">
        <h2 className="font-black">連携する Google アカウントを変えるとき</h2>
        <p className="text-sm">
          カレンダーは、スクリプトを入れた Google アカウントのものが使われます。コマドリにログインするアカウントとは別のアカウントにもできます。
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>古いアカウントの Apps Script で、左の時計のアイコン（トリガー）から「sync」を削除する（プロジェクトごと削除してもよい）</li>
          <li>コマドリの「カレンダー連携」ページで「鍵を作り直す」を押す（古いスクリプトは通信できなくなる）</li>
          <li>新しいアカウントで、この手順書の手順1からやり直す（新しく表示されたスクリプトを使う）</li>
          <li>古いアカウントのカレンダーに入ったコマドリの予定は残るので、要らなければ手で消す</li>
        </ol>
      </section>

      <section className="panel space-y-2 bg-[var(--closed)] p-5">
        <h2 className="font-black">連携を止めるとき</h2>
        <p className="text-sm">
          Apps Script の左側の時計のアイコン（トリガー）を開き、「sync」のトリガーを削除します。コマドリの「鍵を作り直す」を押しても、古いスクリプトは動かなくなります。
        </p>
      </section>
    </main>
  );
}
