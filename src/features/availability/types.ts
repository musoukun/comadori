// 画面とサーバーの両方で使う型。サーバー専用の import を入れない

/** 所有者の画面で見える、コマの状態 */
export type OwnerCellState = "free" | "closed" | "google" | "block" | "booked" | "held";

/** ゲストの画面で見える、コマの状態。予定の理由は伏せる */
export type GuestCellState = "free" | "closed" | "busy" | "held";

export type OwnerCell = {
  start: string;
  end: string;
  state: OwnerCellState;
  /** このコマから予約の長さ分が空いていて、予約を始められる */
  bookable: boolean;
  blockId?: string;
  guestName?: string;
};

export type GuestCell = {
  start: string;
  end: string;
  state: GuestCellState;
  bookable: boolean;
};

export type Day<C> = { date: string; cells: C[] };
