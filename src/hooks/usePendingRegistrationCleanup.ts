import { useEffect } from 'react';
import { ref, remove } from 'firebase/database';
import { rtdb } from '../../firebase.config';
import { useAuthStore } from '../stores/authStore';
import { clearPendingRegistration, getPendingRegistration } from '../services/onboarding/pendingRegistration';
import { deleteCurrentUser, getCurrentUser, signOut } from '../services/firebase/auth';

/**
 * If the app was closed mid-registration (before reaching the dashboard),
 * discard the partially created RTDB profile and Auth user on next launch.
 */
export function usePendingRegistrationCleanup() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    if (isLoading) return;

    let didCancel = false;
    const run = async () => {
      const pending = await getPendingRegistration();
      if (!pending) return;

      const authUser = getCurrentUser();
      if (!authUser || authUser.uid !== pending.uid) {
        await clearPendingRegistration();
        return;
      }

      try {
        await remove(ref(rtdb, `users/${pending.uid}`));
      } catch {
        // ignore
      }

      try {
        // Best-effort immediate deletion (Cloud Function also deletes on RTDB remove).
        await deleteCurrentUser();
      } catch {
        // ignore
      }

      try {
        await signOut();
      } catch {
        // ignore
      }

      if (!didCancel) {
        clearAuth();
      }
      await clearPendingRegistration();
    };

    void run();
    return () => {
      didCancel = true;
    };
  }, [clearAuth, isLoading]);
}

