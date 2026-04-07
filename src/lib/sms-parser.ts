export type SmsIntent =
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "reschedule" }
  | { type: "unknown"; original: string };

export function parseSmsIntent(body: string): SmsIntent {
  const normalized = body.trim().toLowerCase();

  // Check exact digit codes first (universal across languages)
  if (normalized === "1") return { type: "confirm" };
  if (normalized === "2") return { type: "cancel" };
  if (normalized === "28") return { type: "reschedule" };

  // English keywords
  if (["yes", "confirm", "confirmed", "ok", "okay", "sure"].includes(normalized)) {
    return { type: "confirm" };
  }
  if (["no", "cancel", "cancelled", "cancel appointment"].includes(normalized)) {
    return { type: "cancel" };
  }
  if (["reschedule", "change", "different time", "new time", "move"].includes(normalized)) {
    return { type: "reschedule" };
  }

  // Chinese keywords (Mandarin/Cantonese — simplified and traditional)
  if (["确认", "確認", "好", "好的", "是", "是的"].includes(normalized)) {
    return { type: "confirm" };
  }
  if (["取消", "不"].includes(normalized)) {
    return { type: "cancel" };
  }
  if (["改期", "重新预约", "重新預約", "换时间", "換時間"].includes(normalized)) {
    return { type: "reschedule" };
  }

  return { type: "unknown", original: body.trim() };
}
