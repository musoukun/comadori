// 相手のアカウントまわりの決まり
export const GUESTS = {
  /** パスワードの最低文字数 */
  passwordMinLength: 8,
  /** 名前・予定名の最大文字数 */
  maxTextLength: 40,
  /** 登録直後の「カレンダーに表示する予定名」。所有者があとで変える */
  defaultMaskTitle: "予定",
} as const;
