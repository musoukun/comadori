import { redirect } from "next/navigation";
import { dayEndOf } from "@/features/availability/rules";
import { listGuests } from "@/features/guests/guests";
import { getCurrentOwner } from "@/lib/session";
import { formatDate, formatTime, localDateKey } from "@/lib/time";
import Link from "next/link";
import { logoutAction } from "./actions";
import { CopyLink } from "./CopyLink";
import { GuestManager } from "./GuestManager";
import { OwnerBoard } from "./OwnerBoard";

export default async function OwnerPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/");

  const guests = await listGuests(owner.id);
  const connected = Boolean(owner.gasSyncedAt || owner.busyImportedAt);
  const syncStatus = owner.gasSyncedAt
    ? `GASで自動連携中（最終同期: ${formatDate(owner.gasSyncedAt)} ${formatTime(owner.gasSyncedAt)}）`
    : owner.busyImportedAt && owner.busyImportedUntil
      ? `予定の取り込み: ${formatDate(owner.busyImportedAt)}（${formatDate(owner.busyImportedUntil)} まで反映）`
      : "まだカレンダーと連携していません。連携しないと、予定がある時間も空きとして見えます。";

  return (
    <main className="mx-auto max-w-[70.4rem] space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">コマドリ</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{owner.email}</span>
          <Link href="/me/sync" className="btn btn-sm btn-cyan">
            カレンダー連携
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-sm">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <section
        className={`panel flex flex-wrap items-center justify-between gap-3 p-4 ${connected ? "" : "bg-yellow"}`}
      >
        <p className="font-bold">{syncStatus}</p>
        <Link href="/me/sync" className="btn btn-sm">
          {connected ? "連携の設定" : "連携する"}
        </Link>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-black">共有リンク</h2>
        <p className="text-sm text-muted">
          このURLを相手に送ってください。相手はメールアドレスとパスワードで登録・ログインし、空いている時間に予約を入れます。
        </p>
        <CopyLink url={`${process.env.APP_URL}/b/${owner.slug}`} />
      </section>

      <GuestManager guests={guests} />

      <OwnerBoard todayKey={localDateKey(new Date())} dayEndMinutes={dayEndOf(owner)} />
    </main>
  );
}
