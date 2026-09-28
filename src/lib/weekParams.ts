import { isValidMeetingMinutes, SCHEDULING } from "@/config/scheduling";
import { isValidDateKey, localDateKey } from "@/lib/time";

/** 週表示の API で受け取る「表示開始日」と「予約の長さ」を読む。不正なら初期値にする */
export function readWeekParams(params: URLSearchParams) {
  const from = params.get("from") ?? "";
  const minutes = Number(params.get("minutes"));
  return {
    fromKey: isValidDateKey(from) ? from : localDateKey(new Date()),
    minutes: isValidMeetingMinutes(minutes) ? minutes : SCHEDULING.defaultMeetingMinutes,
  };
}
