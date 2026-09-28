import type { NextRequest } from "next/server";
import { buildOwnerWeek, toGuestDays } from "@/features/availability/week";
import { prisma } from "@/lib/db";
import { isValidDateKey, localDateKey } from "@/lib/time";

// ゲスト画面が数秒おきに呼ぶ。予定の理由は伏せて返す
export async function GET(request: NextRequest, ctx: RouteContext<"/api/public/[slug]/week">) {
  const { slug } = await ctx.params;
  const owner = await prisma.owner.findUnique({ where: { slug } });
  if (!owner) return Response.json({ message: "予約ページが見つかりません。" }, { status: 404 });

  const from = request.nextUrl.searchParams.get("from") ?? "";
  const fromKey = isValidDateKey(from) ? from : localDateKey(new Date());
  try {
    const days = await buildOwnerWeek(owner, fromKey);
    return Response.json({ days: toGuestDays(days) });
  } catch (e) {
    console.error(e);
    return Response.json({ message: "空き状況を読み込めませんでした。" }, { status: 502 });
  }
}
