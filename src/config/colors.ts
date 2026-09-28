// 相手が自分の色として選べる色。同じ所有者の相手どうしで重ならないようにする
export const GUEST_COLORS = [
  { id: "tomato", name: "トマト", hex: "#E5484D", text: "#FFFFFF" },
  { id: "flamingo", name: "フラミンゴ", hex: "#FF7AA2", text: "#16130F" },
  { id: "tangerine", name: "ミカン", hex: "#FF8A3D", text: "#16130F" },
  { id: "banana", name: "バナナ", hex: "#FFD23F", text: "#16130F" },
  { id: "lime", name: "ライム", hex: "#B5E655", text: "#16130F" },
  { id: "sage", name: "セージ", hex: "#3DBE8B", text: "#16130F" },
  { id: "peacock", name: "ピーコック", hex: "#5AD2F4", text: "#16130F" },
  { id: "blueberry", name: "ブルーベリー", hex: "#4C6FFF", text: "#FFFFFF" },
  { id: "lavender", name: "ラベンダー", hex: "#B79CFF", text: "#16130F" },
  { id: "grape", name: "ブドウ", hex: "#8E44AD", text: "#FFFFFF" },
  { id: "cocoa", name: "ココア", hex: "#A0673F", text: "#FFFFFF" },
  { id: "graphite", name: "グラファイト", hex: "#5F6368", text: "#FFFFFF" },
] as const;

/** 相手が削除されて色が分からない予約に使う色 */
export const UNKNOWN_COLOR = { id: "unknown", name: "不明", hex: "#D9D3C4", text: "#16130F" };

export function findColor(id: string | null | undefined) {
  return GUEST_COLORS.find((c) => c.id === id) ?? UNKNOWN_COLOR;
}

export function isValidColorId(id: string): boolean {
  return GUEST_COLORS.some((c) => c.id === id);
}
