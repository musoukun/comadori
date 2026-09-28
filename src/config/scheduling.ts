// 予約まわりの業務上の数値。ここだけ直せば挙動が変わる
export const SCHEDULING = {
  /** カレンダーの1コマの長さ（分） */
  slotMinutes: 30,
  /** 1件の予約の長さ（分）。slotMinutes の倍数にする */
  meetingMinutes: 60,
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
