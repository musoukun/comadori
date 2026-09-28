import { notFound } from "next/navigation";
import { SCHEDULING } from "@/config/scheduling";
import { prisma } from "@/lib/db";
import { localDateKey } from "@/lib/time";
import { GuestBoard } from "./GuestBoard";

export default async function GuestPage({ params }: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const owner = await prisma.owner.findUnique({ where: { slug } });
  if (!owner) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <header className="space-y-2">
        <p className="font-display text-xl">コマドリ</p>
        <h1 className="text-2xl font-black">ご都合の良い開始時間を選んでください</h1>
        <p className="text-sm text-muted">
          1件{SCHEDULING.meetingMinutes}分です。時間を選ぶと{SCHEDULING.holdMinutes}
          分間仮押さえされ、その間に確定してください。
        </p>
      </header>
      <GuestBoard slug={slug} todayKey={localDateKey(new Date())} />
    </main>
  );
}
