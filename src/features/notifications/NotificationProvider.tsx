import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { useDatabase } from '@/hooks/useDatabase';
import { configureForegroundNotifications } from '@/services/notifications/ExpoNotificationGateway';

interface NotificationContextValue {
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refreshNotifications: async () => undefined,
});

function getDataValue(data: Record<string, unknown> | undefined, key: string): string | null {
  if (!data) return null;
  return typeof data[key] === 'string' ? data[key] : null;
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { workspace, repositories, services } = useDatabase();
  const [unreadCount, setUnreadCount] = useState(0);
  const reconciling = useRef<Promise<void> | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!reconciling.current) {
      reconciling.current = services.reminders
        .reconcile(workspace.id, workspace.timezone)
        .then(async () => {
          setUnreadCount(await repositories.reminders.countUnread(workspace.id));
        })
        .catch(() => undefined)
        .finally(() => {
          reconciling.current = null;
        });
    }
    await reconciling.current;
  }, [repositories.reminders, services.reminders, workspace.id, workspace.timezone]);

  const openResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const notificationWorkspaceId = getDataValue(data, 'workspaceId');
      if (notificationWorkspaceId !== workspace.id) return;
      const reminderId = getDataValue(data, 'reminderId');
      const debtId = getDataValue(data, 'debtId');
      const type = getDataValue(data, 'type');
      if (reminderId) {
        try {
          await repositories.reminders.markDelivered(workspace.id, reminderId);
          await repositories.reminders.markRead(workspace.id, reminderId);
          setUnreadCount(await repositories.reminders.countUnread(workspace.id));
        } catch {
          // A navegação continua disponível mesmo se a confirmação local falhar.
        }
      }
      if (debtId) router.push({ pathname: '/debts/[id]', params: { id: debtId } });
      else if (type === 'weekly_summary') router.push('/notifications');
    },
    [repositories.reminders, router, workspace.id],
  );

  useEffect(() => {
    configureForegroundNotifications();
    void refreshNotifications();
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      const reminderId = getDataValue(data, 'reminderId');
      if (getDataValue(data, 'workspaceId') === workspace.id && reminderId) {
        void repositories.reminders
          .markDelivered(workspace.id, reminderId)
          .then(() => repositories.reminders.countUnread(workspace.id))
          .then(setUnreadCount)
          .catch(() => undefined);
      }
    });
    const response = Notifications.addNotificationResponseReceivedListener((value) => {
      void openResponse(value).catch(() => undefined);
    });
    void Notifications.getLastNotificationResponseAsync()
      .then(async (lastResponse) => {
        if (!lastResponse) return;
        await openResponse(lastResponse);
        await Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => undefined);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshNotifications();
    });
    return () => {
      received.remove();
      response.remove();
      appState.remove();
    };
  }, [openResponse, refreshNotifications, repositories.reminders, workspace.id]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext);
}
