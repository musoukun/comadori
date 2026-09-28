// 相手のアカウントまわりの決まり
export const GUESTS = {
  /** パスワードの最低文字数 */
  passwordMinLength: 8,
  /** 名前・予定名の最大文字数 */
  maxTextLength: 40,
  /** 登録直後の「カレンダーに表示する予定名」。所有者があとで変える */
  defaultMaskTitle: "予定",
  /** この回数ログインに失敗したら、しばらくログインさせない */
  loginMaxFailures: 10,
  /** ログインさせない時間（分） */
  loginLockMinutes: 3,
  /** パスワード再設定リンクの有効時間（分） */
  resetTokenMinutes: 30,
  /** 再設定メールを続けて送らない間隔（秒） */
  resetRequestIntervalSeconds: 60,
} as const;
