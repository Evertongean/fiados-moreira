export type ReminderType = 'before_due' | 'due_date' | 'overdue' | 'custom';
export type ReminderStatus = 'pending' | 'scheduled' | 'delivered' | 'canceled' | 'failed';

export interface NotificationPreferences {
  beforeDueEnabled: boolean;
  beforeDueDays: number;
  dueDateEnabled: boolean;
  overdueEnabled: boolean;
  overdueIntervalDays: number;
  weeklyEnabled: boolean;
  weeklyWeekday: number;
  hour: number;
  minute: number;
  hideSensitiveContent: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  beforeDueEnabled: true,
  beforeDueDays: 1,
  dueDateEnabled: true,
  overdueEnabled: true,
  overdueIntervalDays: 3,
  weeklyEnabled: true,
  weeklyWeekday: 2,
  hour: 8,
  minute: 0,
  hideSensitiveContent: true,
};

export interface ReminderRecord {
  id: string;
  workspaceId: string;
  debtId: string;
  type: ReminderType;
  scheduledAt: string;
  status: ReminderStatus;
  notificationIdentifier: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderListItem extends ReminderRecord {
  debtDescription: string;
  dueDate: string | null;
}

export interface NotificationPermissionState {
  granted: boolean;
  canAskAgain: boolean;
}

export interface ScheduledDeviceNotification {
  identifier: string;
}

export interface NotificationScheduleContent {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface NotificationGateway {
  getPermission(): Promise<NotificationPermissionState>;
  requestPermission(): Promise<NotificationPermissionState>;
  ensureChannels(): Promise<void>;
  scheduleAt(content: NotificationScheduleContent, date: Date): Promise<string>;
  scheduleWeeklyAt(content: NotificationScheduleContent, date: Date): Promise<string>;
  cancel(identifier: string): Promise<void>;
  listScheduled(): Promise<ScheduledDeviceNotification[]>;
  listPresentedReminderIds(): Promise<string[]>;
}
