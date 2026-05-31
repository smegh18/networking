import { create } from 'zustand';
import type { DashboardStats, Ad, Event } from '../types';

interface DashboardState {
  stats: DashboardStats;
  ads: Ad[];
  events: Event[];
  isLoading: boolean;
}

interface DashboardActions {
  setStats: (stats: DashboardStats) => void;
  setAds: (ads: Ad[]) => void;
  setEvents: (events: Event[]) => void;
  setLoading: (isLoading: boolean) => void;
}

type DashboardStore = DashboardState & DashboardActions;

const initialStats: DashboardStats = {
  businessGiven: 0,
  businessReceived: 0,
  referralGiven: 0,
  referralReceived: 0,
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: initialStats,
  ads: [],
  events: [],
  isLoading: false,

  setStats: (stats) => set({ stats }),

  setAds: (ads) => set({ ads }),

  setEvents: (events) => set({ events }),

  setLoading: (isLoading) => set({ isLoading }),
}));
