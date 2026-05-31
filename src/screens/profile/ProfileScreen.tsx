import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Section } from '../../components/layout/Section';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { SocialLinks } from '../../components/profile/SocialLinks';
import { BusinessGallery } from '../../components/profile/BusinessGallery';
import { TagsList } from '../../components/profile/TagsList';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing } from '../../theme';
import { shareToWhatsApp } from '../../utils/helpers';
import { buildMemberPointsSummary } from '../../utils/memberPoints';
import type { Ask, ProfileStackParamList, Chapter, Event, Meeting, Referral, VisitorInvite, Business } from '../../types';

type Props = StackScreenProps<ProfileStackParamList, 'Profile'>;
type ProfileTab = 'business' | 'activity';

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

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<ProfileTab>('business');
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

  if (!user) {
    return (
      <ScreenWrapper uniformLayout>
        <Text style={styles.emptyText}>{t('profile.noProfileData', 'No profile data found')}</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper uniformLayout>
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

      {/* Business Section */}
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
          style={[styles.tab, activeTab === 'business' && styles.tabActive]}
          onPress={() => setActiveTab('business')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'business' && styles.tabTextActive]}>
            {t('profile.businessInfo', 'Business Information')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
          onPress={() => setActiveTab('activity')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
            {t('profile.memberActivity', 'Member Activity')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'business' ? (
        <>
          <Section title={t('profile.businessInfo')}>
            <Card>
              <View style={styles.infoRow}>
                <Ionicons name="briefcase-outline" size={18} color={colors.textTertiary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('profile.category')}</Text>
                  <Text style={styles.infoValue}>{user.businessCategory || '-'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color={colors.textTertiary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('profile.location', 'Location')}</Text>
                  <Text style={styles.infoValue}>
                    {[user.location?.city, user.location?.state].filter(Boolean).join(', ') || '-'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="home-outline" size={18} color={colors.textTertiary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('profile.businessAddress', 'Business Address')}</Text>
                  <Text style={styles.infoValue}>{user.businessAddress || '-'}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Text style={styles.descriptionLabel}>{t('profile.businessDescription')}</Text>
              <Text style={styles.description}>
                {user.businessDescription || t('profile.noDescription', 'No description added yet')}
              </Text>
            </Card>
          </Section>

          {user.services && user.services.length > 0 ? (
            <Section title={t('profile.servicesOffered')}>
              <TagsList tags={user.services} />
            </Section>
          ) : null}

          <Section title={t('profile.tags')}>
            <TagsList tags={user.businessTags || []} />
          </Section>

          <Section title={t('profile.socialLinks')}>
            <SocialLinks
              links={user.socialLinks}
              businessAddress={user.businessAddress}
              businessArea={user.businessArea}
              location={user.location}
            />
          </Section>

          <Section
            title={t('profile.businessPhotos')}
            actionLabel={t('profile.manage')}
            onAction={() => navigation.navigate('BusinessPhotos')}
          >
            <BusinessGallery photos={user.businessPhotos || []} />
          </Section>

          <View style={styles.actions}>
            <Button
              title={t('profile.editProfile')}
              onPress={() => navigation.navigate('EditProfile')}
              icon="create-outline"
              fullWidth
              style={styles.editButton}
            />
            <Button
              title={t('profile.settings')}
              onPress={() => navigation.navigate('Settings')}
              icon="settings-outline"
              variant="outline"
              fullWidth
            />
          </View>
        </>
      ) : (
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

          <Section title={t('profile.memberActivity', 'Member Activity')}>
            {activityItems.length === 0 ? (
              <Card>
                <Text style={styles.activityEmpty}>
                  {t('profile.noMemberActivity', 'No member activity yet. Your attendance, meetings, and referrals will appear here.')}
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
                          Alert.alert(
                            t('common.error', 'Error'),
                            t('profile.shareWhatsAppFailed', 'Unable to open WhatsApp right now.'),
                          );
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color={colors.success} />
                      <Text style={styles.shareButtonText}>{t('profile.shareOnWhatsApp', 'Share on WhatsApp')}</Text>
                    </TouchableOpacity>
                  </Card>
                ))}
              </View>
            )}
          </Section>
        </>
      )}
    </ScreenWrapper>
  );
};

export default ProfileScreen;

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
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  pointsCard: {
    marginBottom: spacing.xl,
  },
  pointsTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pointsLabel: {
    ...typography.captionMedium,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pointsValue: {
    ...typography.h2,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  pointsRoleBadge: {
    backgroundColor: colors.primaryFaded,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointsRoleText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  pointsSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  pointsBreakdownPreview: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  pointsPreviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointsPreviewLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  pointsPreviewValue: {
    ...typography.bodySmallMedium,
    color: colors.text,
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
  actions: {
    marginBottom: spacing['4xl'],
  },
  editButton: {
    marginBottom: spacing.lg,
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
