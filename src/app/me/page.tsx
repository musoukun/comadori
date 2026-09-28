import { redirect } from "next/navigation";
import { getCurrentOwner } from "@/lib/session";
import { isGoogleConfigured } from "@/lib/google";
import { localDateKey } from "@/lib/time";
import { logoutAction } from "./actions";
import { CopyLink } from "./CopyLink";
import { OwnerBoard } from "./OwnerBoard";

export default async function OwnerPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/");

  const shareUrl = `${process.env.APP_URL}/b/${owner.slug}`;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">コマドリ</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{owner.email}</span>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-sm">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <section className="panel space-y-3 p-5">
        <h2 className="font-black">共有リンク</h2>
        <p className="text-sm text-muted">このURLを相手に送ると、空いている時間に予約を入れてもらえます。</p>
        <CopyLink url={shareUrl} />
      </section>

      {!owner.googleRefreshToken && (
        <section className="panel flex flex-wrap items-center justify-between gap-3 bg-yellow p-4">
          <p className="font-bold">Googleカレンダーと連携していないため、Googleの予定は反映されていません。</p>
          {isGoogleConfigured() && (
            <a href="/api/auth/google" className="btn btn-sm">
              Googleと連携する
            </a>
          )}
        </section>
      )}

      <OwnerBoard todayKey={localDateKey(new Date())} />
    </main>
  );
}
