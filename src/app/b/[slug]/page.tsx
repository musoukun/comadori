import { notFound } from "next/navigation";
import { SCHEDULING } from "@/config/scheduling";
import { findOwnerBySlug, takenColorIds } from "@/features/guests/guests";
import { getCurrentGuest } from "@/lib/session";
import { localDateKey } from "@/lib/time";
import { AuthPanel } from "./AuthPanel";
import { GuestBoard } from "./GuestBoard";

export default async function GuestPage({ params }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const owner = await findOwnerBySlug(slug);
  if (!owner) notFound();

  const current = await getCurrentGuest();
  const guest = current?.ownerId === owner.id ? current : null;
  const takenColors = await takenColorIds(owner.id, guest?.id);

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <header className="space-y-2">
        <p className="font-display text-xl">コマドリ</p>
        <h1 className="text-2xl font-black">
          {guest ? "ご都合の良い開始時間を選んでください" : "ログインして空き時間を見る"}
        </h1>
        {guest && (
          <p className="text-sm text-muted">
            予約の長さを選んでから開始時間を選ぶと、{SCHEDULING.holdMinutes}
            分間仮押さえされます。その間に確定してください。
          </p>
        )}
      </header>
      {guest ? (
        <GuestBoard
          slug={slug}
          todayKey={localDateKey(new Date())}
          me={{ name: guest.name, colorId: guest.colorId }}
          takenColors={takenColors}
        />
      ) : (
        <AuthPanel slug={slug} takenColors={takenColors} />
      )}
    </main>
  );
}
