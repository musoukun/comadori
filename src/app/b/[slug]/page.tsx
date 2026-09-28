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
            空いている時間をクリックすると{SCHEDULING.defaultMeetingMinutes}分、ドラッグすると引っ張った長さ（{SCHEDULING.slotMinutes}分単位・最大{SCHEDULING.maxMeetingMinutes}分）で、{SCHEDULING.holdMinutes}
            分間仮押さえされます。その間に確定してください。自分の予約をクリックすると取り消せます。
          </p>
        )}
      </header>
      {guest ? (
        <GuestBoard
          slug={slug}
          todayKey={localDateKey(new Date())}
          me={{ name: guest.name, colorId: guest.colorId, canNameEvent: guest.useGuestTitle }}
          takenColors={takenColors}
        />
      ) : (
        <AuthPanel slug={slug} takenColors={takenColors} />
      )}
    </main>
  );
}
