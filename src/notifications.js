import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { eventStartDate } from './events';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_LEAD_MS = 5 * 60 * 1000;

const reminderTrigger = (start) => {
  const now = Date.now();
  for (const lead of [DAY_MS, HOUR_MS, MIN_LEAD_MS]) {
    const at = start.getTime() - lead;
    if (at > now) return { date: new Date(at), lead };
  }
  return null;
};

export const ensurePermissions = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('events', {
      name: 'Event reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B81C36',
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const request = await Notifications.requestPermissionsAsync();
  return request.status === 'granted';
};

// Remote push: send the returned token to your backend to broadcast announcements.
export const registerForPushToken = async () => {
  if (!Device.isDevice) return null;
  if (!(await ensurePermissions())) return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch {
    return null;
  }
};

export const scheduledReminderIds = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.reduce((acc, item) => {
    const eventId = item.content?.data?.eventId;
    if (eventId) acc[eventId] = item.identifier;
    return acc;
  }, {});
};

export const scheduleEventReminder = async (event) => {
  if (!(await ensurePermissions())) return { ok: false, reason: 'permission' };
  const trigger = reminderTrigger(eventStartDate(event));
  if (!trigger) return { ok: false, reason: 'past' };
  const prefix = trigger.lead === DAY_MS ? 'Tomorrow' : 'Starting soon';
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${prefix}: ${event.title}`,
      body: `${event.time || 'All day'} · ${event.location || 'Women Impact Club'}`,
      data: { eventId: event.id },
      ...(Platform.OS === 'android' ? { channelId: 'events' } : null),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger.date },
  });
  return { ok: true, identifier };
};

export const cancelReminder = (identifier) =>
  Notifications.cancelScheduledNotificationAsync(identifier);
