export type NotificationCategory =
  | "shift"
  | "task"
  | "equipment"
  | "incident"
  | "calendar"
  | "finance"
  | "test";

export type NotificationPreferencesInput = {
  enabled?: boolean;
  shiftAlerts?: boolean;
  taskAlerts?: boolean;
  equipmentAlerts?: boolean;
  incidentAlerts?: boolean;
  calendarAlerts?: boolean;
  financeAlerts?: boolean;
  quietStart?: string;
  quietEnd?: string;
  timezone?: string;
  device?: NotificationDeviceTelemetryInput;
};

export type NotificationDeviceTelemetryInput = {
  deviceKey?: string;
  subscriptionId?: string | null;
  permission?: "default" | "granted" | "denied";
  optedIn?: boolean;
  active?: boolean;
};

export type PushMessage = {
  category: NotificationCategory;
  dedupeKey: string;
  title: string;
  message: string;
  targetUrl?: string;
  sendAfter?: string;
  urgent?: boolean;
};
