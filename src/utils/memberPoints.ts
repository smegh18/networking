import type {
  Ask,
  Event,
  EventCheckInStatus,
  LeadershipRole,
  Meeting,
  Referral,
  Business,
  User,
  VisitorInvite,
} from '../types';

export const POINT_VALUES = {
  eventPresent: 20,
  eventSubstitute: 10,
  eventLate: 15,
  eventAbsent: -10,
  oneOnOneMeeting: 25,
  outsideReferralGiven: 100,
  referralConvertedToBusiness: 500,
  askClosed: 100,
  askClosedWithBusiness: 500,
  visitorInviteSent: 100,
} as const;

export const LEADERSHIP_ROLE_OPTIONS: Array<{
  key: LeadershipRole;
  label: string;
  defaultPoints: number;
  requiresCity?: boolean;
}> = [
    { key: 'member', label: 'Member', defaultPoints: 0 },
    { key: 'president', label: 'President', defaultPoints: 2000 },
    { key: 'vice_president', label: 'Vice President', defaultPoints: 1500 },
    { key: 'secretary_treasurer', label: 'Secretary Treasurer', defaultPoints: 1000 },
    { key: 'lead_visitor_host', label: 'Lead Visitor Host', defaultPoints: 750 },
    { key: 'coordinator', label: 'Coordinator', defaultPoints: 500 },
    { key: 'mentor_coordinator', label: 'Mentor Coordinator', defaultPoints: 250 },
    { key: 'central_sop_head', label: 'Central SOP Head', defaultPoints: 0 },
    { key: 'regional_chairman', label: 'Regional Chairman', defaultPoints: 0, requiresCity: true },
    { key: 'chapter_launch_director', label: 'Chapter Launch Director', defaultPoints: 0 },
    { key: 'founder', label: 'Founder', defaultPoints: 0 },
    { key: 'support_director', label: 'Support Director', defaultPoints: 0 },
  ];

export type MemberPointBreakdownItem = {
  key: string;
  label: string;
  count: number;
  pointsPerItem: number;
  totalPoints: number;
};

export type MemberPointsSummary = {
  totalPoints: number;
  rolePoints: number;
  roleLabel: string;
  roleCity?: string;
  breakdown: MemberPointBreakdownItem[];
};

function getLeadershipRoleOption(role: LeadershipRole | null | undefined) {
  return LEADERSHIP_ROLE_OPTIONS.find((option) => option.key === (role || 'member'))
    ?? LEADERSHIP_ROLE_OPTIONS[0];
}

export function getLeadershipRoleLabel(role: LeadershipRole | null | undefined): string {
  return getLeadershipRoleOption(role).label;
}

export function getLeadershipRoleDefaultPoints(role: LeadershipRole | null | undefined): number {
  return getLeadershipRoleOption(role).defaultPoints;
}

export function getLeadershipRolePoints(user: Pick<User, 'leadershipRole' | 'leadershipRolePoints'>): number {
  if (typeof user.leadershipRolePoints === 'number' && Number.isFinite(user.leadershipRolePoints)) {
    return user.leadershipRolePoints;
  }
  return getLeadershipRoleDefaultPoints(user.leadershipRole);
}

function pushBreakdown(
  breakdown: MemberPointBreakdownItem[],
  key: string,
  label: string,
  count: number,
  pointsPerItem: number,
) {
  if (!count) return;
  breakdown.push({
    key,
    label,
    count,
    pointsPerItem,
    totalPoints: count * pointsPerItem,
  });
}

function countAttendanceStatus(events: Event[], uid: string, status: EventCheckInStatus): number {
  return events.filter((event) => event.attendanceRecords?.[uid]?.status === status).length;
}

export function buildMemberPointsSummary(args: {
  user: Pick<User, 'uid' | 'leadershipRole' | 'leadershipRolePoints' | 'leadershipRoleCity'>;
  events: Event[];
  meetings: Meeting[];
  referrals: Referral[];
  asks: Ask[];
  visitorInvites: VisitorInvite[];
  business?: Business[];
}): MemberPointsSummary {
  const { user, events, meetings, referrals, asks, visitorInvites, business = [] } = args;
  const uid = user.uid;
  const breakdown: MemberPointBreakdownItem[] = [];

  const presentCount = countAttendanceStatus(events, uid, 'present');
  const lateCount = countAttendanceStatus(events, uid, 'late');
  const absentCount = countAttendanceStatus(events, uid, 'absent');
  const substituteCount = events.filter((event) => {
    const detail = event.attendanceDetails?.[uid];
    const record = event.attendanceRecords?.[uid];
    return !record && detail?.status === 'substituted';
  }).length;

  pushBreakdown(breakdown, 'event_present', 'Present in events', presentCount, POINT_VALUES.eventPresent);
  pushBreakdown(breakdown, 'event_late', 'Late in events', lateCount, POINT_VALUES.eventLate);
  pushBreakdown(breakdown, 'event_absent', 'Absent in events', absentCount, POINT_VALUES.eventAbsent);
  pushBreakdown(breakdown, 'event_substitute', 'Substitute in events', substituteCount, POINT_VALUES.eventSubstitute);

  const completedOneOnOneCount = meetings.filter(
    (meeting) =>
      meeting.type === 'one_on_one'
      && meeting.status === 'completed'
      && (meeting.requesterId === uid || meeting.requesteeId === uid),
  ).length;
  pushBreakdown(
    breakdown,
    'one_on_one_completed',
    'Completed 1-to-1 meetings',
    completedOneOnOneCount,
    POINT_VALUES.oneOnOneMeeting,
  );

  const outsideReferralCount = referrals.filter(
    (referral) => referral.giverId === uid && !String(referral.receiverId || '').trim(),
  ).length;
  pushBreakdown(
    breakdown,
    'outside_referral',
    'Referrals given outside app',
    outsideReferralCount,
    POINT_VALUES.outsideReferralGiven,
  );

  const convertedReferralCount = referrals.filter(
    (referral) => referral.giverId === uid && referral.status === 'completed',
  ).length;
  pushBreakdown(
    breakdown,
    'referral_converted',
    'Referrals converted to business',
    convertedReferralCount,
    POINT_VALUES.referralConvertedToBusiness,
  );

  const askIdsForUser = new Set(asks.filter((ask) => ask.askerUid === uid).map((ask) => ask.id));
  const referredAskIds = new Set(
    referrals
      .filter((referral) => referral.askId && askIdsForUser.has(referral.askId))
      .map((referral) => referral.askId as string),
  );
  const completedAskIds = new Set(
    referrals
      .filter((referral) => referral.askId && askIdsForUser.has(referral.askId) && referral.status === 'completed')
      .map((referral) => referral.askId as string),
  );
  pushBreakdown(breakdown, 'ask_closed', 'Specific asks closed', referredAskIds.size, POINT_VALUES.askClosed);
  pushBreakdown(
    breakdown,
    'ask_closed_business',
    'Specific asks closed with business',
    completedAskIds.size,
    POINT_VALUES.askClosedWithBusiness,
  );

  const visitorInviteCount = visitorInvites.filter((invite) => invite.inviterUid === uid).length;
  pushBreakdown(
    breakdown,
    'visitor_invite',
    'Visitor invites sent',
    visitorInviteCount,
    POINT_VALUES.visitorInviteSent,
  );

  const approvedBusinessAmount = business
    .filter((b) => b.givenById === uid && (!b.status || b.status === 'approved'))
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const businessPointsCount = Math.floor(approvedBusinessAmount / 50000);
  pushBreakdown(
    breakdown,
    'business_given',
    'Business given (₹50k)',
    businessPointsCount,
    50, // 50 points per ₹50k
  );

  const rolePoints = getLeadershipRolePoints(user);
  if (rolePoints !== 0) {
    breakdown.push({
      key: 'leadership_role',
      label: `${getLeadershipRoleLabel(user.leadershipRole)} role bonus`,
      count: 1,
      pointsPerItem: rolePoints,
      totalPoints: rolePoints,
    });
  }

  const totalPoints = breakdown.reduce((sum, item) => sum + item.totalPoints, 0);

  return {
    totalPoints,
    rolePoints,
    roleLabel: getLeadershipRoleLabel(user.leadershipRole),
    roleCity: user.leadershipRoleCity || '',
    breakdown: breakdown.sort((a, b) => Math.abs(b.totalPoints) - Math.abs(a.totalPoints)),
  };
}
