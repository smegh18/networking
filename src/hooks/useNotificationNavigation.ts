import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { navRef } from '../navigation/AppNavigator';

export function useNotificationNavigation() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let isMounted = true;

    // Helper to handle navigation based on the notification data
    const handleNotificationData = (data: Record<string, any>) => {
      // The navRef needs to be ready before we navigate
      if (!navRef.isReady()) {
        // Retry shortly if it's a cold start
        setTimeout(() => handleNotificationData(data), 500);
        return;
      }

      // Check for specific payloads first
      if (data.meetingId) {
        navRef.navigate('Main' as any, {
          screen: 'MainTabs',
          params: {
            screen: 'DashboardTab',
            params: {
              screen: 'Interactions',
              params: { tab: 'received' },
            },
          },
        });
        return;
      }

      if (data.eventId) {
        navRef.navigate('Main' as any, {
          screen: 'MainTabs',
          params: {
            screen: 'DashboardTab',
            params: {
              screen: 'EventDetail',
              params: { eventId: data.eventId },
            },
          },
        });
        return;
      }

      if (data.referralId) {
        navRef.navigate('Main' as any, {
          screen: 'MainTabs',
          params: {
            screen: 'DashboardTab',
            params: {
              screen: 'ReferralStatus',
            },
          },
        });
        return;
      }

      // Fallback: If there's no specific route, just go to Notifications
      navRef.navigate('Main' as any, {
        screen: 'MainTabs',
        params: {
          screen: 'MoreTab',
          params: {
            screen: 'Notifications',
          },
        },
      });
    };

    // 1. Handle notification tapped while app is open (background/foreground)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data) {
        handleNotificationData(data);
      }
    });

    // 2. Handle notification tapped to wake up app from killed state (cold start)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (isMounted && response && response.notification.request.content.data) {
        handleNotificationData(response.notification.request.content.data);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);
}
