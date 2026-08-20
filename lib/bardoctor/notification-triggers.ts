import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  accounts,
  domainData,
  notificationPreferences,
  venueMemberships,
  venues,
} from "../../db/schema";
import {
  hasPermission,
  type PermissionKey,
} from "./access-control";
import { membershipsForAccount } from "./auth";
import {
  OPPORTUNITY_CALENDAR_KEY,
  reconcileOpportunityNotifications,
  saveOpportunityCalendar,
  type OpportunityCalendar,
} from "./opportunity-calendar";
import { evaluateNotificationRules } from "./notification-rules";
import {
  preferencePayload,
  sendPushToAccount,
} from "./notifications";
import { notificationRunIsDue } from "./notification-run-schedule";
import type { NotificationCategory } from "./notification-types";

type JsonRecord = Record<string, unknown>;

const TRIGGER_STORE_KEYS = [
  "bd_finance_revenue",
  "bd_finance_gap_reasons",
  "bd_tasks",
  "bd_action_tasks",
  "bd_equipment",
  "bd_cases",
  OPPORTUNITY_CALENDAR_KEY,
  "bd_month_closings",
] as const;

type TriggerSummary = {
  accounts: number;
  candidates: number;
  accepted: number;
  duplicates: number;
  failed: number;
};

function emptySummary(accounts = 0): TriggerSummary {
  return {
    accounts,
    candidates: 0,
    accepted: 0,
    duplicates: 0,
    failed: 0,
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

const CATEGORY_PERMISSION: Record<Exclude<NotificationCategory, "test">, PermissionKey> = {
  shift: "shifts.view",
  task: "tasks.view",
  equipment: "equipment.view",
  incident: "incidents.view",
  calendar: "calendar.view",
  finance: "finance.view",
};

async function runForMembership(
  subscription: {
    account: typeof accounts.$inferSelect;
    preferences: typeof notificationPreferences.$inferSelect;
  },
  membershipContext: Awaited<ReturnType<typeof membershipsForAccount>>[number],
  origin: string,
): Promise<TriggerSummary> {
  const summary = emptySummary(1);
  if (!membershipContext.dataAccount.restaurantJson) return summary;
  const restaurant = record(parseJson(membershipContext.dataAccount.restaurantJson));
  if (!restaurant) return summary;

  const rows = await getDb()
    .select()
    .from(domainData)
    .where(and(
      eq(domainData.accountId, membershipContext.dataAccount.id),
      inArray(domainData.storeKey, [...TRIGGER_STORE_KEYS]),
    ));
  const stores = new Map(rows.map((row) => [row.storeKey, parseJson(row.dataJson)]));
  const preferences = preferencePayload(subscription.preferences);

  const storedOpportunityCalendar = record(stores.get(OPPORTUNITY_CALENDAR_KEY));
  if (storedOpportunityCalendar && membershipContext.role === "owner") {
    try {
      const previous = storedOpportunityCalendar as OpportunityCalendar;
      const next = JSON.parse(JSON.stringify(previous)) as OpportunityCalendar;
      const synced = await reconcileOpportunityNotifications({
        accountId: membershipContext.dataAccount.id,
        venueId: membershipContext.venue.id,
        origin,
        previous,
        next,
      });
      if (JSON.stringify(synced) !== JSON.stringify(previous)) {
        await saveOpportunityCalendar(membershipContext.dataAccount.id, synced);
      }
      stores.set(OPPORTUNITY_CALENDAR_KEY, synced);
    } catch {
      summary.failed += 1;
    }
  }

  const messages = evaluateNotificationRules({
    restaurant,
    stores,
    preferences,
  }).filter((message) => hasPermission(
    { role: membershipContext.role, permissions: membershipContext.permissions },
    CATEGORY_PERMISSION[message.category as Exclude<NotificationCategory, "test">],
  ));
  summary.candidates += messages.length;

  for (const message of messages) {
    try {
      const result = await sendPushToAccount(subscription.account.id, origin, {
        ...message,
        dedupeKey: `venue:${membershipContext.venue.id}:${message.dedupeKey}`,
        targetUrl: `${message.targetUrl || "/home"}${(message.targetUrl || "/home").includes("?") ? "&" : "?"}venue=${membershipContext.venue.id}`,
      });
      if (result.duplicate) summary.duplicates += 1;
      else summary.accepted += 1;
    } catch {
      summary.failed += 1;
    }
  }

  return summary;
}

async function runForSubscription(
  subscription: {
    account: typeof accounts.$inferSelect;
    preferences: typeof notificationPreferences.$inferSelect;
  },
  origin: string,
  onlyVenueId?: number,
): Promise<TriggerSummary> {
  const summary = emptySummary();
  const contexts = (await membershipsForAccount(subscription.account))
    .filter((item) => onlyVenueId === undefined || item.venue.id === onlyVenueId);
  try {
    for (const context of contexts) {
      mergeSummary(summary, await runForMembership(subscription, context, origin));
    }
  } finally {
    await getDb()
      .update(notificationPreferences)
      .set({ lastRunAt: new Date().toISOString() })
      .where(eq(notificationPreferences.accountId, subscription.account.id));
  }
  return summary;
}

function mergeSummary(target: TriggerSummary, source: TriggerSummary) {
  target.accounts += source.accounts;
  target.candidates += source.candidates;
  target.accepted += source.accepted;
  target.duplicates += source.duplicates;
  target.failed += source.failed;
}

export async function runNotificationTriggersForAccount(
  accountId: number,
  origin: string,
): Promise<TriggerSummary> {
  const [venue] = await getDb()
    .select({ id: venues.id })
    .from(venues)
    .where(eq(venues.dataAccountId, accountId))
    .limit(1);
  if (!venue) return emptySummary();
  const memberRows = await getDb()
    .select({ accountId: venueMemberships.accountId })
    .from(venueMemberships)
    .where(
      and(
        eq(venueMemberships.venueId, venue.id),
        eq(venueMemberships.status, "active"),
      ),
    );
  const memberIds = memberRows.map((row) => row.accountId);
  if (!memberIds.length) return emptySummary();
  const subscriptions = await getDb()
    .select({ account: accounts, preferences: notificationPreferences })
    .from(notificationPreferences)
    .innerJoin(accounts, eq(accounts.id, notificationPreferences.accountId))
    .where(and(
      inArray(notificationPreferences.accountId, memberIds),
      eq(notificationPreferences.enabled, true),
    ));
  const summary = emptySummary();
  for (const subscription of subscriptions) {
    mergeSummary(summary, await runForSubscription(subscription, origin, venue.id));
  }
  return summary;
}

export async function runNotificationTriggers(origin: string): Promise<TriggerSummary> {
  const subscriptions = await getDb()
    .select({ account: accounts, preferences: notificationPreferences })
    .from(notificationPreferences)
    .innerJoin(accounts, eq(accounts.id, notificationPreferences.accountId))
    .where(eq(notificationPreferences.enabled, true));

  const summary = emptySummary();
  for (const subscription of subscriptions) {
    mergeSummary(summary, await runForSubscription(subscription, origin));
  }
  return summary;
}

export async function notificationTriggersAreDue(now = new Date()): Promise<boolean> {
  const rows = await getDb()
    .select({ lastRunAt: notificationPreferences.lastRunAt })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.enabled, true));
  return notificationRunIsDue(rows.map((row) => row.lastRunAt), now);
}
