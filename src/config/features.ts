// 機能の切り替え
export const FEATURES = {
  /**
   * Google カレンダー API での自動連携（予定の読み込みと、予約の書き込み）。
   * 不特定多数に使ってもらうには Google の審査が必要なので、今は止めている。
   * 止めている間、Google ログインはメールアドレスの確認だけに使い、
   * カレンダー連携は .ics の取り込みと購読カレンダーで行う
   */
  googleCalendarApi: false,
} as const;
