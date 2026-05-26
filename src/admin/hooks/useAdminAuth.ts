import { useAuthStore } from '../../stores/authStore';

export function useAdminAuth() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  return { isAdmin, user };
}
