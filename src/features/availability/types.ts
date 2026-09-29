// 画面とサーバーの両方で使う型。サーバー専用の import を入れない

/** 所有者の画面で見える、コマの状態 */
/** calendar は、自分のカレンダー（取り込み・Google 連携）で埋まっている時間 */
export type OwnerCellState = "free" | "closed" | "calendar" | "block" | "booked" | "held";

/**
 * 相手の画面で見える、コマの状態。他の人の予定は理由を伏せる。
 * mine は自分の確定済みの予約、myHold は自分の仮押さえ
 */
export type GuestCellState = "free" | "closed" | "busy" | "held" | "mine" | "myHold";

export type OwnerCell = {
  start: string;
  end: string;
  state: OwnerCellState;
  /** このコマから指定の長さ分が空いていて、予約を始められる */
  bookable: boolean;
  blockId?: string;
  /** 自分のカレンダーの予定名（calendar のとき）。所有者の画面にだけ出す */
  calendarTitle?: string;
  /** 予約（仮押さえ含む）のとき、カレンダーに出す予定名・相手・相手の色 */
  bookingId?: string;
  title?: string;
  guestId?: string;
  guestName?: string;
  colorId?: string;
};

export type GuestCell = {
  start: string;
  end: string;
  state: GuestCellState;
  bookable: boolean;
  /** 自分の確定済みの予約（mine）のときだけ。取り消しに使う */
  bookingId?: string;
};

export type Day<C> = { date: string; cells: C[] };
