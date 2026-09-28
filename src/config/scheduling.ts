// 予約まわりの業務上の数値。ここだけ直せば挙動が変わる
export const SCHEDULING = {
  /** カレンダーの1コマの長さ（分）。予約の開始時刻と長さはこの単位で選ぶ */
  slotMinutes: 15,
  /** 予約の長さの初期値と上限（分）。slotMinutes の倍数にする */
  defaultMeetingMinutes: 60,
  maxMeetingMinutes: 120,
  /** 所有者がクリックで入れるブロックの長さの初期値（分） */
  defaultBlockMinutes: 15,
  /** 仮押さえの有効時間（分） */
  holdMinutes: 5,
  /** 受付開始・終了の時刻（日本時間） */
  dayStartHour: 9,
  dayEndHour: 19,
  /** 受け付ける曜日（0=日曜 … 6=土曜） */
  workdays: [1, 2, 3, 4, 5],
  /** 何日先まで予約を受け付けるか */
  daysAhead: 28,
  /** 今から何時間後以降を予約可能にするか */
  minLeadHours: 3,
  /** ゲスト画面の空き状況を取り直す間隔（秒） */
  pollSeconds: 5,
  /** 表示と判定に使うタイムゾーンのUTCからのずれ（分）。日本は +540 */
  tzOffsetMinutes: 540,
} as const;

/** 選べる予約の長さ（分）。15, 30, 45 … maxMeetingMinutes */
export const MEETING_MINUTES_OPTIONS = Array.from(
  { length: SCHEDULING.maxMeetingMinutes / SCHEDULING.slotMinutes },
  (_, i) => (i + 1) * SCHEDULING.slotMinutes,
);

export function isValidMeetingMinutes(minutes: number): boolean {
  return MEETING_MINUTES_OPTIONS.includes(minutes);
}

/** "60分" "1時間30分" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}
