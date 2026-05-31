import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Section } from '../../components/layout/Section';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { SocialLinks } from '../../components/profile/SocialLinks';
import { BusinessGallery } from '../../components/profile/BusinessGallery';
import { TagsList } from '../../components/profile/TagsList';
import { Card } from '../../components/ui/Card';
import { useRealtimeCollection, useRealtimeRecord } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { shareToWhatsApp } from '../../utils/helpers';
import { buildMemberPointsSummary } from '../../utils/memberPoints';
import type { Ask, AdminStackParamList, Chapter, Event, Meeting, Referral, VisitorInvite, Business, User } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminUserDetails'>;
type ProfileTab = 'activity' | 'business';

type MemberActivityItem = {
  id: string;
  kind: 'attendance' | 'meeting' | 'referral_given' | 'referral_received' | 'substitute';
  occurredAt: string;
  title: string;
  summary: string;
  meta?: string;
  shareText: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
};

const AdminUserDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId } = route.params;
  const { value: user, loading: userLoading } = useRealtimeRecord<User | null>(`users/${userId}`, null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('activity');

  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
  const { items: events } = useRealtimeCollection<Event>('events');
  const { items: meetings } = useRealtimeCollection<Meeting>('meetings');
  const { items: referrals } = useRealtimeCollection<Referral>('referrals');
  const { items: asks } = useRealtimeCollection<Ask>('asks');
  const { items: visitorInvites } = useRealtimeCollection<VisitorInvite>('visitorInvites');
  const { items: businessEntries } = useRealtimeCollection<Business>('business');

  const chapterName = useMemo(
    () => (user?.chapterId ? chapters.find((c) => c.id === user.chapterId)?.name : undefined),
    [user?.chapterId, chapters],
  );

  const pointsSummary = useMemo(
    () => (user
      ? buildMemberPointsSummary({ user, events, meetings, referrals, asks, visitorInvites, business: businessEntries })
      : null),
    [asks, events, meetings, referrals, user, visitorInvites, businessEntries],
  );

  const totalPoints = pointsSummary?.totalPoints || 0;
  const membershipTier = getMembershipTier(totalPoints);

  const activityItems = useMemo<MemberActivityItem[]>(() => {
    if (!user?.uid) return [];

    const attendanceActivities: MemberActivityItem[] = [];
    events.forEach((event) => {
      const record = event.attendanceRecords?.[user.uid];
      const detail = event.attendanceDetails?.[user.uid];

      if (record) {
        const activityMap = {
          present: {
            title: `Present at ${event.title}`,
            summary: `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} at ${event.location || 'the venue'}`,
            shareText: `I was marked present at ${event.title} on ${formatActivityTime(record.recordedAt)} through Brahmin Connect.`,
            icon: 'checkmark-circle-outline' as const,
            accentColor: colors.success,
          },
          late: {
            title: `Late at ${event.title}`,
            summary: `Late arrival recorded for ${event.location || 'the event venue'}`,
            shareText: `My attendance for ${event.title} was marked late on ${formatActivityTime(record.recordedAt)} through Brahmin Connect.`,
            icon: 'time-outline' as const,
            accentColor: colors.warning,
          },
          absent: {
            title: `Absent for ${event.title}`,
            summary: `Absence recorded for ${event.type} at ${event.location || 'the venue'}`,
            shareText: `My attendance for ${event.title} was marked absent on ${formatActivityTime(record.recordedAt)} through Brahmin Connect.`,
            icon: 'close-circle-outline' as const,
            accentColor: colors.error,
          },
        } as const;

        const config = activityMap[record.status];
        attendanceActivities.push({
          id: `attendance_${event.id}_${record.status}`,
          kind: 'attendance' as const,
          occurredAt: record.recordedAt,
          title: config.title,
          summary: config.summary,
          meta: formatActivityTime(record.recordedAt),
          shareText: config.shareText,
          icon: config.icon,
          accentColor: config.accentColor,
        });
        return;
      }

      if (detail?.status === 'substituted') {
        attendanceActivities.push({
          id: `attendance_${event.id}_substituted`,
          kind: 'substitute' as const,
          occurredAt: detail.updatedAt,
          title: `Substitute arranged for ${event.title}`,
          summary: `${detail.substituteName || 'Substitute'} will attend in your place`,
          meta: formatActivityTime(detail.updatedAt),
          shareText: `I arranged a substitute for ${event.title} through Brahmin Connect.`,
          icon: 'swap-horizontal-outline' as const,
          accentColor: colors.info,
        });
      }
    });

    const oneToOneActivities = meetings
      .filter(
        (meeting) =>
          meeting.type === 'one_on_one'
          && meeting.status !== 'rejected'
          && (meeting.requesterId === user.uid || meeting.requesteeId === user.uid),
      )
      .map((meeting) => {
        const otherPerson = meeting.requesterId === user.uid ? meeting.requesteeName : meeting.requesterName;
        const scheduledAt = normalizeMeetingTimestamp(meeting);
        return {
          id: `meeting_${meeting.id}`,
          kind: 'meeting' as const,
          occurredAt: scheduledAt,
          title: `1-to-1 meeting with ${otherPerson}`,
          summary: `Status: ${formatLabel(meeting.status)} • ${meeting.scheduledTime || 'Scheduled meeting'}`,
          meta: formatActivityTime(scheduledAt),
          shareText: `I had a 1-to-1 meeting with ${otherPerson} on ${formatActivityTime(scheduledAt)} through Brahmin Connect.`,
          icon: 'people-outline' as const,
          accentColor: colors.info,
        };
      });

    const referralActivities = referrals
      .filter((referral) => referral.giverId === user.uid || referral.receiverId === user.uid)
      .map((referral) => {
        const isGiven = referral.giverId === user.uid;
        const directionLabel = isGiven ? 'given' : 'received';
        const otherPerson = isGiven ? referral.receiverName : referral.giverName;
        const amountText = formatCurrency(referral.amount || 0);
        return {
          id: `referral_${referral.id}_${directionLabel}`,
          kind: isGiven ? 'referral_given' as const : 'referral_received' as const,
          occurredAt: referral.createdAt,
          title: `${isGiven ? 'Reference given' : 'Reference received'}${amountText ? ` • ${amountText}` : ''}`,
          summary: `${isGiven ? 'Business given to' : 'Business received from'} ${otherPerson}`,
          meta: `${formatActivityTime(referral.createdAt)}${referral.contactName ? ` • Contact: ${referral.contactName}` : ''}`,
          shareText: `I ${isGiven ? 'gave' : 'received'} a business reference ${isGiven ? 'to' : 'from'} ${otherPerson}${amountText ? ` worth ${amountText}` : ''} through Brahmin Connect.`,
          icon: isGiven ? 'arrow-up-circle-outline' as const : 'arrow-down-circle-outline' as const,
          accentColor: isGiven ? colors.secondary : colors.accent,
        };
      });

    const combinedActivities: MemberActivityItem[] = [...attendanceActivities, ...oneToOneActivities, ...referralActivities];
    return combinedActivities.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }, [events, meetings, referrals, user?.uid]);

  if (userLoading) {
    return (
      <AdminLayout title="User Details" activeScreen="AdminUsers" showBackButton onBack={() => navigation.navigate('AdminUsers')}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout title="User Details" activeScreen="AdminUsers" showBackButton onBack={() => navigation.navigate('AdminUsers')}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No user data found</Text>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="User Details"
      activeScreen="AdminUsers"
      showBackButton
      onBack={() => navigation.navigate('AdminUsers')}
    >
      <View style={styles.breadcrumb}>
        <TouchableOpacity onPress={() => navigation.navigate('AdminUsers')} activeOpacity={0.7}>
          <Text style={styles.breadcrumbLink}>User Management</Text>
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={styles.breadcrumbIcon} />
        <Text style={styles.breadcrumbCurrent}>{user.name}</Text>
      </View>

      <ProfileHeader user={user} chapterName={chapterName} />

      <View style={styles.businessSection}>
        <Text style={styles.businessSectionTitle}>Membership</Text>
          <View style={styles.businessCardsRow}>
          <Card style={StyleSheet.flatten([styles.businessCard, { backgroundColor: membershipTier.cardBackground }])}>
            <View style={[styles.businessCardIcon, { backgroundColor: membershipTier.iconBackground }]}>
              <Ionicons name="medal-outline" size={22} color={membershipTier.color} />
            </View>
            <Text style={styles.businessCardLabel}>Membership Type</Text>
            <Text style={[styles.businessCardValue, { color: membershipTier.color }]}>{membershipTier.label}</Text>
          </Card>

          <Card style={styles.businessCard}>
            <View style={[styles.businessCardIcon, { backgroundColor: colors.primaryFaded }]}>
              <Ionicons name="star-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.businessCardLabel}>Points</Text>
            <Text style={[styles.businessCardValue, { color: colors.primary }]}>
              {totalPoints.toLocaleString('en-IN')}
            </Text>
          </Card>
        </View>
      </View>

      <View style={styles.businessSection}>
        <Text style={styles.businessSectionTitle}>Business</Text>
        <View style={styles.businessCardsRow}>
          <Card style={styles.businessCard}>
            <View style={[styles.businessCardIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="arrow-up-circle-outline" size={22} color={colors.success} />
            </View>
            <Text style={styles.businessCardLabel}>Business Given</Text>
            <Text style={[styles.businessCardValue, { color: colors.success }]}>
              ₹{(user?.uid
                ? businessEntries
                  .filter((b) => b.givenById === user.uid && (!b.status || b.status === 'approved'))
                  .reduce((sum, b) => sum + (b.amount || 0), 0)
                : 0
              ).toLocaleString('en-IN')}
            </Text>
          </Card>
          <Card style={styles.businessCard}>
            <View style={[styles.businessCardIcon, { backgroundColor: colors.accentFaded }]}>
              <Ionicons name="arrow-down-circle-outline" size={22} color={colors.accent} />
            </View>
            <Text style={styles.businessCardLabel}>Business Received</Text>
            <Text style={[styles.businessCardValue, { color: colors.accent }]}>
              ₹{(user?.uid
                ? businessEntries
                  .filter((b) => b.givenToId === user.uid && (!b.status || b.status === 'approved'))
                  .reduce((sum, b) => sum + (b.amount || 0), 0)
                : 0
              ).toLocaleString('en-IN')}
            </Text>
          </Card>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
          onPress={() => setActiveTab('activity')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
            Member Activity
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'business' && styles.tabActive]}
          onPress={() => setActiveTab('business')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'business' && styles.tabTextActive]}>
            Business Information
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'activity' ? (
        <>
          <Section title="Points Breakdown">
            {pointsSummary && pointsSummary.breakdown.length > 0 ? (
              <Card>
                <View style={styles.pointsList}>
                  {pointsSummary.breakdown.map((item) => (
                    <View key={item.key} style={styles.pointsListRow}>
                      <View style={styles.pointsListText}>
                        <Text style={styles.pointsListTitle}>{item.label}</Text>
                        <Text style={styles.pointsListMeta}>
                          {item.count} x {formatSignedPoints(item.pointsPerItem)}
                        </Text>
                      </View>
                      <Text style={styles.pointsListValue}>{formatSignedPoints(item.totalPoints)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : (
              <Card>
                <Text style={styles.activityEmpty}>No points awarded yet.</Text>
              </Card>
            )}
          </Section>

          <Section title="Member Activity">
            {activityItems.length === 0 ? (
              <Card>
                <Text style={styles.activityEmpty}>
                  No member activity yet. Attendance, meetings, and referrals will appear here.
                </Text>
              </Card>
            ) : (
              <View style={styles.activityList}>
                {activityItems.map((activity) => (
                  <Card key={activity.id} style={styles.activityCard}>
                    <View style={styles.activityHeader}>
                      <View style={[styles.activityIconWrap, { backgroundColor: `${activity.accentColor}18` }]}>
                        <Ionicons name={activity.icon} size={18} color={activity.accentColor} />
                      </View>
                      <View style={styles.activityTextWrap}>
                        <Text style={styles.activityTitle}>{activity.title}</Text>
                        <Text style={styles.activityMeta}>{activity.meta || '-'}</Text>
                      </View>
                    </View>

                    <Text style={styles.activitySummary}>{activity.summary}</Text>

                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={async () => {
                        try {
                          await Linking.openURL(shareToWhatsApp(activity.shareText));
                        } catch {
                          Alert.alert('Error', 'Unable to open WhatsApp right now.');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color={colors.success} />
                      <Text style={styles.shareButtonText}>Share on WhatsApp</Text>
                    </TouchableOpacity>
                  </Card>
                ))}
              </View>
            )}
          </Section>
        </>
      ) : (
        <>
          <Section title="Business Information">
            <Card>
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={18} color={colors.textTertiary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>{user.businessCategory || '-'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color={colors.textTertiary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>
                    {[user.location?.city, user.location?.state].filter(Boolean).join(', ') || '-'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="home-outline" size={18} color={colors.textTertiary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Business Address</Text>
                  <Text style={styles.infoValue}>{user.businessAddress || '-'}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Text style={styles.descriptionLabel}>Business Description</Text>
              <Text style={styles.description}>
                {user.businessDescription || 'No description added yet'}
              </Text>
            </Card>
          </Section>

          {user.services && user.services.length > 0 ? (
            <Section title="Services Offered">
              <TagsList tags={user.services} />
            </Section>
          ) : null}

          <Section title="Tags">
            <TagsList tags={user.businessTags || []} />
          </Section>

          <Section title="Social Links">
            <SocialLinks links={user.socialLinks} businessAddress={user.businessAddress} />
          </Section>

          <Section title="Business Photos">
            <BusinessGallery photos={user.businessPhotos || []} />
          </Section>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminUserDetailsScreen;

function normalizeMeetingTimestamp(meeting: Meeting): string {
  if (meeting.createdAt) return meeting.createdAt;
  if (meeting.scheduledDate) {
    return meeting.scheduledDate.includes('T') ? meeting.scheduledDate : `${meeting.scheduledDate}T00:00:00`;
  }
  return new Date(0).toISOString();
}

function formatActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  if (!amount) return '';
  return `Rs ${amount.toLocaleString('en-IN')}`;
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSignedPoints(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}

type MembershipTier = {
  label: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  color: string;
  cardBackground: string;
  iconBackground: string;
};

function getMembershipTier(points: number): MembershipTier {
  if (points >= 6000) {
    return {
      label: 'Platinum',
      color: '#64748B',
      cardBackground: '#F1F5F9',
      iconBackground: '#E2E8F0',
    };
  }
  if (points >= 2500) {
    return {
      label: 'Gold',
      color: '#B45309',
      cardBackground: colors.secondaryFaded,
      iconBackground: colors.warningLight,
    };
  }
  if (points >= 1000) {
    return {
      label: 'Silver',
      color: '#6B7280',
      cardBackground: '#F3F4F6',
      iconBackground: '#E5E7EB',
    };
  }
  return {
    label: 'Bronze',
    color: '#C2410C',
    cardBackground: '#FFF7ED',
    iconBackground: '#FFEDD5',
  };
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  breadcrumbLink: {
    ...typography.bodySmallMedium,
    color: colors.primary,
  },
  breadcrumbIcon: {
    marginHorizontal: spacing.xs,
  },
  breadcrumbCurrent: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 14,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  infoContent: {
    marginLeft: spacing.lg,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  descriptionLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  pointsList: {
    gap: spacing.md,
  },
  pointsListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pointsListText: {
    flex: 1,
  },
  pointsListTitle: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  pointsListMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  pointsListValue: {
    ...typography.bodySemiBold,
    color: colors.primary,
  },
  activityList: {
    gap: spacing.lg,
  },
  activityCard: {
    marginBottom: spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  activityMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  activitySummary: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.successLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  shareButtonText: {
    ...typography.captionMedium,
    color: colors.success,
  },
  activityEmpty: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  businessSection: {
    marginBottom: spacing.xl,
  },
  businessSectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  businessCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  businessCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  businessCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  businessCardLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  businessCardValue: {
    ...typography.h3,
  },
});
