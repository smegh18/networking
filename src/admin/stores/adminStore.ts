import { create } from 'zustand';
import type { User, Chapter, Zone, Event, Meeting, Referral, Ad, Ask, AppNotification } from '../../types';

import type { AdminDashboardStats } from '../types/admin';

interface AdminState {
  stats: AdminDashboardStats | null;
  statsLoading: boolean;
  activeScreen: string;
  users: User[];
  usersLoading: boolean;
  chapters: Chapter[];
  zones: Zone[];

  events: Event[];
  referrals: Referral[];
  ads: Ad[];
  asks: Ask[];
  notifications: AppNotification[];
}

interface AdminActions {
  setActiveScreen: (screen: string) => void;
  setStats: (stats: AdminDashboardStats) => void;
  setStatsLoading: (loading: boolean) => void;
  setUsers: (users: User[]) => void;
  setUsersLoading: (loading: boolean) => void;
  setChapters: (chapters: Chapter[]) => void;
  setZones: (zones: Zone[]) => void;

  setEvents: (events: Event[]) => void;
  setReferrals: (referrals: Referral[]) => void;
  setAds: (ads: Ad[]) => void;
  setAsks: (asks: Ask[]) => void;
  setNotifications: (notifications: AppNotification[]) => void;
  resetAdmin: () => void;
}

const initialState: AdminState = {
  stats: null,
  statsLoading: false,
  activeScreen: 'AdminDashboard',
  users: [],
  usersLoading: false,
  chapters: [],
  zones: [],

  events: [],
  referrals: [],
  ads: [],
  asks: [],
  notifications: [],
};

export const useAdminStore = create<AdminState & AdminActions>((set) => ({
  ...initialState,

  setActiveScreen: (activeScreen) => set({ activeScreen }),
  setStats: (stats) => set({ stats }),
  setStatsLoading: (statsLoading) => set({ statsLoading }),
  setUsers: (users) => set({ users }),
  setUsersLoading: (usersLoading) => set({ usersLoading }),
  setChapters: (chapters) => set({ chapters }),
  setZones: (zones) => set({ zones }),

  setEvents: (events) => set({ events }),
  setReferrals: (referrals) => set({ referrals }),
  setAds: (ads) => set({ ads }),
  setAsks: (asks) => set({ asks }),
  setNotifications: (notifications) => set({ notifications }),
  resetAdmin: () => set(initialState),
}));
