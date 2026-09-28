import type { NextRequest } from "next/server";
import { buildOwnerWeek } from "@/features/availability/week";
import { getCurrentOwner } from "@/lib/session";
import { readWeekParams } from "@/lib/weekParams";

export async function GET(request: NextRequest) {
  const owner = await getCurrentOwner();
  if (!owner) return Response.json({ message: "ログインしてください。" }, { status: 401 });

  const { fromKey, minutes } = readWeekParams(request.nextUrl.searchParams);
  try {
    return Response.json({ days: await buildOwnerWeek(owner, fromKey, minutes) });
  } catch (e) {
    console.error(e);
    return Response.json({ message: "カレンダーを読み込めませんでした。" }, { status: 502 });
  }
}
