import type { NextRequest } from "next/server";
import { buildOwnerWeek } from "@/features/availability/week";
import { getCurrentOwner } from "@/lib/session";
import { isValidDateKey, localDateKey } from "@/lib/time";

export async function GET(request: NextRequest) {
  const owner = await getCurrentOwner();
  if (!owner) return Response.json({ message: "ログインしてください。" }, { status: 401 });

  const from = request.nextUrl.searchParams.get("from") ?? "";
  const fromKey = isValidDateKey(from) ? from : localDateKey(new Date());
  try {
    return Response.json({ days: await buildOwnerWeek(owner, fromKey) });
  } catch (e) {
    console.error(e);
    return Response.json({ message: "カレンダーを読み込めませんでした。" }, { status: 502 });
  }
}
