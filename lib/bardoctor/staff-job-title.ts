/** Venue-scoped display metadata. All these jobs use the cashier access role. */
export const STAFF_JOB_TITLES = ["cashier", "waiter", "barista", "bartender"] as const;
export type StaffJobTitle = (typeof STAFF_JOB_TITLES)[number];
export const STAFF_JOB_LABELS: Record<StaffJobTitle, string> = {
  cashier: "Кассир", waiter: "Официант", barista: "Бариста", bartender: "Бармен",
};

export function isStaffJobTitle(value: unknown): value is StaffJobTitle {
  return STAFF_JOB_TITLES.includes(value as StaffJobTitle);
}

export function validStaffJobTitle(role: unknown, value: unknown): boolean {
  return value == null || role === "cashier" && isStaffJobTitle(value);
}

/** Old cashier memberships have no title; their existing access stays unchanged. */
export function staffJobTitle(role: unknown, value: unknown): StaffJobTitle | null {
  return role === "cashier" ? isStaffJobTitle(value) ? value : "cashier" : null;
}
