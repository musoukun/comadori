import { findOwnerByGasRequest, markGasSynced } from "@/features/sync/gas";
import { ImportError, importBusy, type BusyInput } from "@/features/sync/importedBusy";

// GAS が送ってくる「埋まっている時間帯」。取り込んだ分と同じ場所に入れ替えで保存する
export async function POST(request: Request) {
  const owner = await findOwnerByGasRequest(request);
  if (!owner) return Response.json({ message: "連携の鍵が正しくありません。" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { busy?: BusyInput[]; until?: string } | null;
  if (!body || !Array.isArray(body.busy) || typeof body.until !== "string") {
    return Response.json({ message: "送られてきた内容が正しくありません。" }, { status: 400 });
  }
  try {
    const { count } = await importBusy(owner.id, body.busy, body.until);
    await markGasSynced(owner.id);
    return Response.json({ count });
  } catch (e) {
    if (e instanceof ImportError) return Response.json({ message: e.message }, { status: 400 });
    throw e;
  }
}
