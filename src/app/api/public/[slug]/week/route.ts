import type { NextRequest } from "next/server";
import { buildOwnerWeek, toGuestDays } from "@/features/availability/week";
import { findActiveHold } from "@/features/booking/booking";
import { findOwnerBySlug } from "@/features/guests/guests";
import { getCurrentGuest } from "@/lib/session";
import { readWeekParams } from "@/lib/weekParams";

// 相手の画面が数秒おきに呼ぶ。自分の予約以外は理由を伏せて返す
export async function GET(request: NextRequest, ctx: RouteContext<"/api/public/[slug]/week">) {
  const { slug } = await ctx.params;
  const owner = await findOwnerBySlug(slug);
  if (!owner) return Response.json({ message: "予約ページが見つかりません。" }, { status: 404 });

  const guest = await getCurrentGuest();
  if (!guest || guest.ownerId !== owner.id) {
    return Response.json({ message: "ログインしてください。" }, { status: 401 });
  }

  const { fromKey, minutes } = readWeekParams(request.nextUrl.searchParams);
  try {
    const [days, myHold] = await Promise.all([
      buildOwnerWeek(owner, fromKey, minutes),
      findActiveHold(guest.id),
    ]);
    return Response.json({ days: toGuestDays(days, guest.id), myHold });
  } catch (e) {
    console.error(e);
    return Response.json({ message: "空き状況を読み込めませんでした。" }, { status: 502 });
  }
}
