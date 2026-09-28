import { bookingsForGas, findOwnerByGasRequest } from "@/features/sync/gas";

// GAS がカレンダーに反映する予約の一覧
export async function GET(request: Request) {
  const owner = await findOwnerByGasRequest(request);
  if (!owner) return Response.json({ message: "連携の鍵が正しくありません。" }, { status: 401 });
  return Response.json(await bookingsForGas(owner.id));
}
