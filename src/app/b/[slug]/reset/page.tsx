import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findOwnerBySlug } from "@/features/guests/guests";
import { isUsableResetToken } from "@/features/guests/passwordReset";
import { ResetForm } from "./ResetForm";

// URL にトークンが入るので、外部サイトへのリンクを踏んでも参照元として漏れないようにする
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function ResetPage({ params, searchParams }: PageProps<"/b/[slug]/reset">) {
  const { slug } = await params;
  const { token } = await searchParams;
  if (!(await findOwnerBySlug(slug))) notFound();

  const usable = typeof token === "string" && (await isUsableResetToken(token));

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <p className="font-display text-xl">コマドリ</p>
      {usable ? (
        <ResetForm slug={slug} token={token} />
      ) : (
        <div className="panel mx-auto max-w-md space-y-4 p-6">
          <h1 className="font-black">このリンクは使えません</h1>
          <p className="text-sm">期限が切れたか、すでに使われています。ログイン画面からもう一度、再設定のメールを送ってください。</p>
          <Link href={`/b/${slug}`} className="btn btn-sm">
            ログイン画面へ
          </Link>
        </div>
      )}
    </main>
  );
}
