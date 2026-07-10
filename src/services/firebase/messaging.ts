import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ref, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configure how notifications appear when the app is in the foreground.
 * This should be called once at app startup (e.g. in App.tsx or a
 * top-level provider).
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ---------------------------------------------------------------------------
// Token Registration
// ---------------------------------------------------------------------------

/**
 * Request notification permissions from the user and obtain
 * the Expo push token.
 *
 * On Android, this also creates a default notification channel.
 *
 * @returns The Expo push token string, or null if permissions
 *          were denied or the device is a simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (Platform.OS === 'web') {
    console.warn(
      'Push notifications require a physical device. Skipping registration.',
    );
    return null;
  }

  // Create a notification channel on Android (required for Android 8+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    });
  }

  // Check / request permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permission not granted.');
    return null;
  }

  // Obtain the Expo push token.
  // The projectId is required for Expo managed workflow and is read
  // from the app config (app.json / app.config.ts).
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      'EAS project ID not found. Push token registration skipped. ' +
        'Set `extra.eas.projectId` in your app config.',
    );
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

/**
 * Persist the push token to the user's RTDB profile so the
 * backend (e.g. Cloud Functions) can send targeted notifications.
 */
export async function savePushToken(
  userId: string,
  token: string,
): Promise<void> {
  await update(ref(rtdb, `users/${userId}`), {
    pushToken: token,
    pushTokenUpdatedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Local Notifications
// ---------------------------------------------------------------------------

/**
 * Schedule (or immediately display) a local notification.
 *
 * @param title  The notification title.
 * @param body   The notification body text.
 * @param data   Optional payload attached to the notification.
 *               This data is available when the user taps the notification.
 * @returns      The scheduled notification identifier.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: true,
    },
    // null trigger = display immediately
    trigger: null,
  });
  return id;
}

// ---------------------------------------------------------------------------
// Notification Listeners (helpers for use in React components)
// ---------------------------------------------------------------------------

/**
 * Add a listener that fires whenever a notification is received
 * while the app is foregrounded.
 *
 * @returns A subscription that should be removed on cleanup.
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener that fires when the user taps a notification.
 *
 * @returns A subscription that should be removed on cleanup.
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the notification response that launched / foregrounded the app,
 * if any. Useful for deep-linking from a killed state.
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

/**
 * Get the current badge count.
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set the app badge count (iOS, some Android launchers).
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
