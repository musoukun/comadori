// カレンダー連携（.ics の取り込みと購読カレンダー）の決まり
export const SYNC = {
  /** 取り込む期間の選択肢（日） */
  importDaysOptions: [30, 60, 90],
  /** 取り込める期間の上限（日） */
  maxImportDays: 90,
  /** 1回に取り込める時間帯の数の上限 */
  maxImportIntervals: 3000,
  /** 繰り返し予定を展開するときの、1つの予定あたりの上限回数 */
  maxOccurrencesPerEvent: 20000,
  /** 購読カレンダーと GAS 連携で扱う過去の予約（日） */
  feedPastDays: 30,
  /** GAS が同期する間隔（分）。Apps Script で使えるのは 1, 5, 10, 15, 30 */
  gasIntervalMinutes: 15,
  /** GAS が埋まりを送る期間（日）。maxImportDays 以下にする */
  gasSyncDays: 60,
} as const;
