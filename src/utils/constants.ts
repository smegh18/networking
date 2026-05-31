export const MEETING_TYPES = {
  b2b: { label: 'B2B Meeting', icon: 'briefcase-outline' },
  one_on_one: { label: '1-on-1 Meeting', icon: 'account-outline' },
} as const;

export const REFERRAL_STATUSES = {
  pending: { label: 'Pending', color: '#F59E0B' },
  contacted: { label: 'Contacted', color: '#3B82F6' },
  completed: { label: 'Completed', color: '#10B981' },
  lost: { label: 'Lost', color: '#EF4444' },
} as const;

export const EVENT_TYPES = {
  meeting: { label: 'Meeting', icon: 'people-outline', color: '#3B82F6' },
  event: { label: 'Event', icon: 'calendar-outline', color: '#8B5CF6' },
  webinar: { label: 'Webinar', icon: 'videocam-outline', color: '#10B981' },
} as const;

export const LANGUAGES = [
  { code: 'en' as const, label: 'English', nativeLabel: 'English' },
  { code: 'hi' as const, label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'gu' as const, label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
] as const;
