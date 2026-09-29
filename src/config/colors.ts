// 相手の色。よく使う色を並べておき、カラーピッカーで好きな色も選べる。他の人と同じ色でもよい。
// 保存するのは "#RRGGBB"。古いデータの "grape" のような名前も読めるようにしておく
export const GUEST_COLORS = [
  { id: "tomato", name: "トマト", hex: "#E5484D" },
  { id: "flamingo", name: "フラミンゴ", hex: "#FF7AA2" },
  { id: "tangerine", name: "ミカン", hex: "#FF8A3D" },
  { id: "banana", name: "バナナ", hex: "#FFD23F" },
  { id: "lime", name: "ライム", hex: "#B5E655" },
  { id: "sage", name: "セージ", hex: "#3DBE8B" },
  { id: "peacock", name: "ピーコック", hex: "#5AD2F4" },
  { id: "blueberry", name: "ブルーベリー", hex: "#4C6FFF" },
  { id: "lavender", name: "ラベンダー", hex: "#B79CFF" },
  { id: "grape", name: "ブドウ", hex: "#8E44AD" },
  { id: "cocoa", name: "ココア", hex: "#A0673F" },
  { id: "graphite", name: "グラファイト", hex: "#5F6368" },
] as const;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const INK = "#16130F";
const WHITE = "#FFFFFF";

/** 相手が削除されて色が分からない予約に使う色 */
export const UNKNOWN_COLOR = { hex: "#D9D3C4", text: INK };

/** 背景色の明るさから、読みやすい文字色（黒か白）を決める */
function textColorFor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? INK : WHITE;
}

/** 保存された色（"#RRGGBB" か、古いデータの名前）から、表示に使う色を返す */
export function findColor(value: string | null | undefined): { hex: string; text: string } {
  if (value && HEX_COLOR.test(value)) return { hex: value, text: textColorFor(value) };
  const preset = GUEST_COLORS.find((c) => c.id === value);
  return preset ? { hex: preset.hex, text: textColorFor(preset.hex) } : UNKNOWN_COLOR;
}

/** 保存できる色か。新しく保存するのは "#RRGGBB" だけ */
export function isValidColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** よく使う色から1つ選ぶ（登録画面の初期値） */
export function randomPresetColor(): string {
  return GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)].hex;
}
