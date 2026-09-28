import { redirect } from "next/navigation";
import { listGuests } from "@/features/guests/guests";
import { canWriteEvents, isGoogleConfigured } from "@/lib/google";
import { getCurrentOwner } from "@/lib/session";
import { localDateKey } from "@/lib/time";
import { logoutAction } from "./actions";
import { CopyLink } from "./CopyLink";
import { GuestManager } from "./GuestManager";
import { OwnerBoard } from "./OwnerBoard";

export default async function OwnerPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/");

  const guests = await listGuests(owner.id);
  const googleNotice = !owner.googleRefreshToken
    ? "Googleカレンダーと連携していないため、Googleの予定の反映と、予約の書き込みができません。"
    : !canWriteEvents(owner.googleScopes)
      ? "予約をGoogleカレンダーに書き込む許可がありません。もう一度連携してください。"
      : null;

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

      {googleNotice && (
        <section className="panel flex flex-wrap items-center justify-between gap-3 bg-yellow p-4">
          <p className="font-bold">{googleNotice}</p>
          {isGoogleConfigured() && (
            <a href="/api/auth/google" className="btn btn-sm">
              Googleと連携する
            </a>
          )}
        </section>
      )}

      <section className="panel space-y-3 p-5">
        <h2 className="font-black">共有リンク</h2>
        <p className="text-sm text-muted">
          このURLを相手に送ってください。相手はメールアドレスとパスワードで登録・ログインし、空いている時間に予約を入れます。
        </p>
        <CopyLink url={`${process.env.APP_URL}/b/${owner.slug}`} />
      </section>

      <GuestManager guests={guests} />

      <OwnerBoard todayKey={localDateKey(new Date())} />
    </main>
  );
}
