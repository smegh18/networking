import { useEffect } from 'react';
import { onAuthStateChanged, syncMyAccount } from '../services/firebase/auth';
import { resolveUserProfileForFirebaseUser } from '../services/firebase/userProfile';
import { useAuthStore } from '../stores/authStore';
import { configureNotifications, registerForPushNotifications, savePushToken } from '../services/firebase/messaging';
import { Platform } from 'react-native';

// Configure foreground notifications globally
if (Platform.OS !== 'web') {
  configureNotifications();
}

/**
 * Syncs auth store with Firebase auth state on app load.
 * When Firebase has a user, fetches user from RTDB and sets store.
 * When Firebase has no user, clears store.
 */
export function useAuthInit() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        clearAuth();
        setLoading(false);
        return;
      }
      try {
        let didSync = false;
        let user = await resolveUserProfileForFirebaseUser(firebaseUser);
        if (!user) {
          await syncMyAccount();
          didSync = true;
          user = await resolveUserProfileForFirebaseUser(firebaseUser);
        }
        if (user) {
          setUser(user);
          // Best-effort repair: keep Auth + RTDB identifiers in sync for older/incomplete accounts.
          if (!didSync) void syncMyAccount();

          // Register for push notifications
          if (Platform.OS !== 'web') {
            registerForPushNotifications().then((token) => {
              if (token) {
                savePushToken(user.uid, token).catch(console.error);
              }
            });
          }
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [setUser, setLoading, clearAuth]);
}
