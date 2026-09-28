import { redirect } from "next/navigation";
import { getCurrentOwner } from "@/lib/session";

export default async function Home() {
  if (await getCurrentOwner()) redirect("/me");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-4 text-center">
      <h1 className="font-display text-6xl">コマドリ</h1>
      <p className="text-lg font-bold">
        空いている時間をリンクで共有して、
        <br />
        相手に予定を入れてもらう日程調整アプリ
      </p>
      <a href="/api/auth/google" className="btn btn-yellow px-8 py-3 text-lg">
        Googleでログイン
      </a>
    </main>
  );
}
