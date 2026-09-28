import { buildFeed, findOwnerByFeedToken } from "@/features/sync/feed";

// Google カレンダーなどが定期的に取りに来る、予約の購読カレンダー
export async function GET(_request: Request, ctx: RouteContext<"/api/feed/[token]">) {
  const { token } = await ctx.params;
  const owner = await findOwnerByFeedToken(token);
  if (!owner) return new Response("Not found", { status: 404 });

  return new Response(await buildFeed(owner.id), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="comadori.ics"',
      "Cache-Control": "no-store",
    },
  });
}
