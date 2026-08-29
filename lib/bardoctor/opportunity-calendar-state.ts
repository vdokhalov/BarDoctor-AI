import type { OpportunityCalendar } from "./opportunity-calendar";

export function opportunityCalendarNeedsPersistence(
  stored: OpportunityCalendar | null,
  next: OpportunityCalendar,
): boolean {
  return JSON.stringify(stored) !== JSON.stringify(next);
}
