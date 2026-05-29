export type AccessRole = 'member' | 'admin' | 'superadmin';
export type LeadershipRole =
  | 'member'
  | 'president'
  | 'vice_president'
  | 'secretary_treasurer'
  | 'lead_visitor_host'
  | 'coordinator'
  | 'mentor_coordinator'
  | 'central_sop_head'
  | 'regional_chairman'
  | 'chapter_launch_director'
  | 'founder'
  | 'support_director';

export interface User {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name: string;
  phone: string;
  photoURL: string;
  businessName: string;
  businessDescription: string;
  companyType?: string;
  businessCategory: string;
  businessTags: string[];
  businessPhotos: string[];
  services?: string[];
  businessAddress?: string;
  isWhatsAppSame?: boolean;
  socialLinks: SocialLinks;
  chapterId: string;
  zoneId: string;
  location: Location;
  dateOfBirth: string;
  language: Language;
  biometricEnabled: boolean;
  role?: AccessRole;
  leadershipRole?: LeadershipRole;
  leadershipRolePoints?: number;
  leadershipRoleCity?: string;
  leadershipRoleChapterIds?: string[];
  isActive?: boolean;
  /** Set true once the user finishes registration. */
  profileComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  whatsapp: string;
  linkedin: string;
  google?: string;
}

export interface Location {
  city: string;
  state: string;
}

export interface Chapter {
  id: string;
  name: string;
  zoneId: string;
  location: Location;
  memberCount: number;
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
  region: string;
  chapterCount: number;
}

export type EventAttendanceStatus = 'attending' | 'not_attending' | 'substituted';
export type EventCheckInStatus = 'present' | 'late' | 'absent';
export type EventCheckInSource = 'scanner' | 'manual' | 'self';

export interface EventAttendanceDetail {
  status: EventAttendanceStatus;
  substituteName?: string;
  substitutePhone?: string;
  substitutionCount?: number;
  updatedAt: string;
}

export interface EventCheckInRecord {
  status: EventCheckInStatus;
  recordedAt: string;
  updatedAt: string;
  source: EventCheckInSource;
  updatedBy?: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  organizer: string;
  organizerName: string;
  chapterId: string;
  chapterIds?: string[];
  type: 'meeting' | 'event' | 'webinar';
  attendees: string[];
  /** Per-user attendance state (uid -> detail). Persisted in RTDB. */
  attendanceDetails?: Record<string, EventAttendanceDetail>;
  /** Per-user attendance records captured by admin scanning/manual entry. */
  attendanceRecords?: Record<string, EventCheckInRecord>;
  /** UIDs that have been marked present at the event. */
  checkedInUsers?: string[];
  imageURL: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Meeting {
  id: string;
  requesterId: string;
  requesterName: string;
  requesteeId: string;
  requesteeName: string;
  type: 'b2b' | 'one_on_one';
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  askId?: string;
  giverId: string;
  giverName: string;
  receiverId: string;
  receiverName: string;
  businessDescription: string;
  contactName: string;
  contactPhone: string;
  status: 'pending' | 'contacted' | 'completed' | 'lost';
  amount: number;
  createdAt: string;
}

export interface VisitorInvite {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  businessName: string;
  inviterUid: string;
  inviterName: string;
  eventId: string;
  eventTitle: string;
  status: 'pending' | 'accepted' | 'rejected' | 'attended';
  createdAt: string;
}

export interface Ad {
  id: string;
  userId: string;
  /** Optional navigation target for the banner. Defaults to user profile if omitted. */
  targetType?: 'user' | 'event';
  /** UID for user target, or eventId for event target. */
  targetId?: string;
  businessName: string;
  imageURL: string;
  title: string;
  description: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'birthday' | 'event' | 'meeting' | 'referral' | 'system';
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  bbcTotal?: number;
  chapterBusiness?: number;
  cityBusiness?: number;
  businessReceived?: number;
  businessGiven?: number;
  referralGiven?: number;
  referralReceived?: number;
  businessGivenAmount?: number;
  businessReceivedAmount?: number;
}

export type BusinessType = 'ask_board' | 'one_on_one' | 'referral';

export interface Business {
  id: string;
  date: string;
  name: string;
  chapterId: string;
  chapterName: string;
  type: BusinessType;
  status?: 'pending' | 'approved' | 'rejected';
  givenById: string;
  givenByName: string;
  givenToId: string;
  givenToName: string;
  referredById?: string;
  referredByName?: string;
  amount: number;
  city?: string;
  state?: string;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  type: 'business' | 'tag' | 'category';
  user: User;
  matchField: string;
}

export interface Ask {
  id: string;
  service: string;
  category: string;
  description: string;
  askerName: string;
  askerUid: string;
  askerBusinessName: string;
  askerPhone: string;
  askerWhatsapp: string;
  createdAt: string;
}

export interface BusinessConfig {
  businessCategories: string[];
  servicesByCategory: Record<string, string[]>;
  tagsByCategory: Record<string, string[]>;
  popularTags: string[];
}

export type Language = 'en' | 'hi' | 'gu';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Admin: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { mode?: 'register' };
  PhoneLogin: undefined;
  OTPVerification: { email: string };
  Register: { email?: string };
  BiometricSetup: undefined;
  LanguageSelect: undefined;
  AdminLogin: undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  NetworkTab: undefined;
  ProfileTab: undefined;
  MoreTab: undefined;
};

export type MoreStackParamList = {
  More: undefined;
  Notifications: undefined;
  NotificationDetail: { notificationId: string };
  InviteVisitor: undefined;
  Events: undefined;
  EventDetail: { eventId: string };
  EventAttendanceScanner: { eventId: string };
  ReferralStatus: undefined;
  Settings: undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  SearchResults: { query: string };
  Events: undefined;
  EventDetail: { eventId: string };
  EventAttendanceScanner: { eventId: string };
  ScheduleMeeting: {
    userId?: string;
    askId?: string;
    askService?: string;
    askCategory?: string;
    askDescription?: string;
  };
  ReferralStatus: undefined;
  AskDetail: { askId: string };
  Interactions: undefined;
  InviteVisitor: undefined;
  BusinessGiven: undefined;
  AddBusiness: undefined;
};

export type NetworkStackParamList = {
  Network: undefined;
  BusinessProfile: { userId: string };
  Filter: undefined;
  Request: { userId: string; type: 'b2b' | 'one_on_one' };
};

export type NotificationsStackParamList = {
  Notifications: undefined;
  NotificationDetail: { notificationId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  BusinessPhotos: undefined;
  Settings: undefined;
  LanguageSettings: undefined;
};
