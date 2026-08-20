/** OneSignal documents a maximum provider scheduling horizon of 30 days. */
export const ONESIGNAL_DOCUMENTED_SCHEDULE_HORIZON_DAYS = 30;
export const ONESIGNAL_SCHEDULE_SAFETY_MS = 60 * 60 * 1000;
export const ONESIGNAL_MIN_SCHEDULE_LEAD_MS = 30 * 60 * 1000;

export function oneSignalScheduleHorizonMs(): number {
  return ONESIGNAL_DOCUMENTED_SCHEDULE_HORIZON_DAYS * 86_400_000;
}

export function oneSignalScheduleWindow(sendAt: string, now = Date.now()): "invalid" | "too_soon" | "within" | "too_far" {
  const timestamp = new Date(sendAt).getTime();
  if (!Number.isFinite(timestamp)) return "invalid";
  if (timestamp <= now + ONESIGNAL_MIN_SCHEDULE_LEAD_MS) return "too_soon";
  return timestamp <= now + oneSignalScheduleHorizonMs() - ONESIGNAL_SCHEDULE_SAFETY_MS ? "within" : "too_far";
}

export function oneSignalCanScheduleAt(sendAt: string, now = Date.now()): boolean {
  return oneSignalScheduleWindow(sendAt, now) === "within";
}
