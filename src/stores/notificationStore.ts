import { create } from 'zustand';
import type { AppNotification } from '../types';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
}

interface NotificationActions {
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  setLoading: (isLoading: boolean) => void;
}

type NotificationStore = NotificationState & NotificationActions;

const computeUnreadCount = (notifications: AppNotification[]): number =>
  notifications.filter((n) => !n.read).length;

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: computeUnreadCount(notifications),
    }),

  addNotification: (notification) =>
    set((state) => {
      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: computeUnreadCount(updated),
      };
    }),

  markRead: (notificationId) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: computeUnreadCount(updated),
      };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  setLoading: (isLoading) => set({ isLoading }),
}));
