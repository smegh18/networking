import type { User, Chapter, Event, Meeting, Referral, Ad, Ask, AppNotification } from '../../types';

export interface AdminDashboardStats {
  totalUsers: number;
  totalChapters: number;
  totalEvents: number;
  totalMeetings: number;
  totalReferrals: number;
  totalAds: number;
  totalAsks: number;
  activeUsers: number;
  pendingReferrals: number;
  completedReferrals: number;
  upcomingEvents: number;
  referralTotalAmount: number;
}

export interface AdminNavItem {
  key: string;
  label: string;
  icon: string;
  iconActive: string;
  screen: string;
}

export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: number | string;
  render?: (item: T) => React.ReactNode;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminUserDetails: { userId: string };
  AdminRoles: undefined;
  AdminUserForm: { userId?: string };
  AdminChapters: undefined;
  AdminEvents: undefined;
  AdminEventAttendanceList: undefined;
  AdminEventForm: { eventId?: string };
  AdminEventAttendance: { eventId: string };
  AdminReferrals: undefined;
  AdminTransactions: undefined;
  AdminTransactionForm: { transactionId: string };
  AdminAds: undefined;
  AdminAdForm: { adId?: string };
  AdminAsks: undefined;
  AdminNotifications: undefined;
  AdminBusinessConfig: undefined;
  AdminCategoryRequests: undefined;
};
