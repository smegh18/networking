import { useAuthStore } from '../../stores/authStore';

export function useAdminAuth() {
  const user = useAuthStore((s) => s.user);
  const isChapterAdmin = user?.leadershipRole === 'president';
  const isGlobalAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !isChapterAdmin);
  const isAdmin = isGlobalAdmin || isChapterAdmin;
  return { isAdmin, isGlobalAdmin, isChapterAdmin, user };
}
