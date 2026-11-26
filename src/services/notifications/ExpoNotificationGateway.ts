import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type {
  NotificationGateway,
  NotificationPermissionState,
  NotificationScheduleContent,
  ScheduledDeviceNotification,
} from '@/features/notifications/domain/notificationTypes';

const COLLECTIONS_CHANNEL = 'collections';
const WEEKLY_CHANNEL = 'weekly-summary';

function toPermissionState(
  permission: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  return { granted: permission.granted, canAskAgain: permission.canAskAgain };
}

export class ExpoNotificationGateway implements NotificationGateway {
  async getPermission(): Promise<NotificationPermissionState> {
    return toPermissionState(await Notifications.getPermissionsAsync());
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    return toPermissionState(await Notifications.requestPermissionsAsync());
  }

  async ensureChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(COLLECTIONS_CHANNEL, {
      name: 'Lembretes de cobrança',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
    });
    await Notifications.setNotificationChannelAsync(WEEKLY_CHANNEL, {
      name: 'Resumo semanal',
      importance: AndroidImportance.DEFAULT,
    });
  }

  scheduleAt(content: NotificationScheduleContent, date: Date): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: COLLECTIONS_CHANNEL,
        delivery: 'bestEffort',
      },
    });
  }

  scheduleWeeklyAt(content: NotificationScheduleContent, date: Date): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: WEEKLY_CHANNEL,
        delivery: 'bestEffort',
      },
    });
  }

  cancel(identifier: string): Promise<void> {
    return Notifications.cancelScheduledNotificationAsync(identifier);
  }

  async listScheduled(): Promise<ScheduledDeviceNotification[]> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.map(({ identifier }) => ({ identifier }));
  }

  async listPresentedReminderIds(): Promise<string[]> {
    const presented = await Notifications.getPresentedNotificationsAsync();
    return presented.flatMap((notification) => {
      const value = notification.request.content.data?.reminderId;
      return typeof value === 'string' ? [value] : [];
    });
  }
}

export function configureForegroundNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
