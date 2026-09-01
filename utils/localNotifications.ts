import * as Notifications from 'expo-notifications';

// Fires an OS local notification, gated by the caller-supplied
// enabled flag (the Settings > Notifications toggle). Defaults to an
// immediate trigger; pass a scheduled trigger (e.g. weekly) for
// recurring notifications like the weekly report reminder.
export async function fireLocalNotification(
  enabled: boolean,
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput = null,
  data?: Record<string, unknown>
): Promise<void> {
  if (!enabled) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        ...(data ? { data } : {}),
      },
      trigger,
    });
  } catch (error) {
    console.error('Failed to show local notification:', error);
  }
}
