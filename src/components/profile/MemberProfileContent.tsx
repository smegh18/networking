import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { ProfileHeader } from './ProfileHeader';
import { SocialLinks } from './SocialLinks';
import { BusinessGallery } from './BusinessGallery';
import { TagsList } from './TagsList';
import { Section } from '../layout/Section';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { colors, typography, spacing } from '../../theme';
import { shareToWhatsApp } from '../../utils/helpers';
import { buildMemberPointsSummary } from '../../utils/memberPoints';
import type { Ask, User, Event, Meeting, Referral, VisitorInvite, Business } from '../../types';

export type ProfileTab = 'business' | 'activity';

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

type MembershipTier = {
  label: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  color: string;
  cardBackground: string;
  iconBackground: string;
};

export type MemberProfileContentProps = {
  user: User;
  chapterName?: string;
  events: Event[];
  meetings: Meeting[];
  referrals: Referral[];
  asks: Ask[];
  visitorInvites: VisitorInvite[];
  businessEntries: Business[];
  defaultTab?: ProfileTab;
  /** Shown above tabs (e.g. admin status + actions) */
  headerSlot?: React.ReactNode;
  /** Replaces default edit/settings buttons on business tab */
  businessTabFooter?: React.ReactNode;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
  onManagePhotos?: () => void;
  showManagePhotosAction?: boolean;
  /** `scroll` shows business + activity sections in one page; `tabs` switches between them */
  layout?: 'tabs' | 'scroll';
};

export const MemberProfileContent: React.FC<MemberProfileContentProps> = ({
  user,
  chapterName,
  events,
  meetings,
  referrals,
  asks,
  visitorInvites,
  businessEntries,
  defaultTab = 'business',
  headerSlot,
  businessTabFooter,
  onEditProfile,
  onOpenSettings,
  onManagePhotos,
  showManagePhotosAction = false,
  layout = 'tabs',
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const cardsStacked = width < 640;
  const isScrollLayout = layout === 'scroll';
  const [activeTab, setActiveTab] = useState<ProfileTab>(defaultTab);

  const pointsSummary = useMemo(
    () =>
      buildMemberPointsSummary({
        user,
        events,
        meetings,
        referrals,
        asks,
        visitorInvites,
        business: businessEntries,
      }),
    [asks, events, meetings, referrals, user, visitorInvites, businessEntries],
  );

  const totalPoints = pointsSummary?.totalPoints || 0;
  const membershipTier = useMemo(() => getMembershipTier(totalPoints), [totalPoints]);

  const businessGiven = useMemo(
    () =>
      businessEntries
        .filter((b) => b.givenById === user.uid && (!b.status || b.status === 'approved'))
        .reduce((sum, b) => sum + (b.amount || 0), 0),
    [businessEntries, user.uid],
  );

  const businessReceived = useMemo(
    () =>
      businessEntries
        .filter((b) => b.givenToId === user.uid && (!b.status || b.status === 'approved'))
        .reduce((sum, b) => sum + (b.amount || 0), 0),
    [businessEntries, user.uid],
  );

  const activityItems = useMemo<MemberActivityItem[]>(() => {
    const attendanceActivities: MemberActivityItem[] = [];
    events.forEach((event) => {
      const record = event.attendanceRecords?.[user.uid];
      const detail = event.attendanceDetails?.[user.uid];

      if (record) {
        const activityMap = {
          present: {
            title: `Present at ${event.title}`,
            summary: `${(event.type || 'event').charAt(0).toUpperCase()}${(event.type || 'event').slice(1)} at ${event.location || 'the venue'}`,
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
            summary: `Absence recorded for ${event.type || 'event'} at ${event.location || 'the venue'}`,
            shareText: `My attendance for ${event.title} was marked absent on ${formatActivityTime(record.recordedAt)} through Brahmin Connect.`,
            icon: 'close-circle-outline' as const,
            accentColor: colors.error,
          },
        } as const;

        const config = activityMap[record.status];
        attendanceActivities.push({
          id: `attendance_${event.id}_${record.status}`,
          kind: 'attendance',
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
          kind: 'substitute',
          occurredAt: detail.updatedAt,
          title: `Substitute arranged for ${event.title}`,
          summary: `${detail.substituteName || 'Substitute'} will attend in your place`,
          meta: formatActivityTime(detail.updatedAt),
          shareText: `I arranged a substitute for ${event.title} through Brahmin Connect.`,
          icon: 'swap-horizontal-outline',
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
        const otherPerson =
          meeting.requesterId === user.uid ? meeting.requesteeName : meeting.requesterName;
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
          kind: isGiven ? ('referral_given' as const) : ('referral_received' as const),
          occurredAt: referral.createdAt,
          title: `${isGiven ? 'Reference given' : 'Reference received'}${amountText ? ` • ${amountText}` : ''}`,
          summary: `${isGiven ? 'Business given to' : 'Business received from'} ${otherPerson}`,
          meta: `${formatActivityTime(referral.createdAt)}${referral.contactName ? ` • Contact: ${referral.contactName}` : ''}`,
          shareText: `I ${isGiven ? 'gave' : 'received'} a business reference ${isGiven ? 'to' : 'from'} ${otherPerson}${amountText ? ` worth ${amountText}` : ''} through Brahmin Connect.`,
          icon: isGiven ? ('arrow-up-circle-outline' as const) : ('arrow-down-circle-outline' as const),
          accentColor: isGiven ? colors.secondary : colors.accent,
        };
      });

    return [...attendanceActivities, ...oneToOneActivities, ...referralActivities].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }, [events, meetings, referrals, user.uid]);

  const renderActivitySections = () => (
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
                  <Text style={styles.pointsListValue}>
                    {formatSignedPoints(item.totalPoints)}
                  </Text>
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
              {t(
                'profile.noMemberActivity',
                'No member activity yet. Your attendance, meetings, and referrals will appear here.',
              )}
            </Text>
          </Card>
        ) : (
          <View style={styles.activityList}>
            {activityItems.map((activity) => (
              <Card key={activity.id} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View
                    style={[
                      styles.activityIconWrap,
                      { backgroundColor: `${activity.accentColor}18` },
                    ]}
                  >
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
                  <Text style={styles.shareButtonText}>
                    {t('profile.shareOnWhatsApp', 'Share on WhatsApp')}
                  </Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}
      </Section>
    </>
  );

  const renderBusinessSections = () => (
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
              <Text style={styles.infoLabel}>
                {t('profile.businessAddress', 'Business Address')}
              </Text>
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
        actionLabel={showManagePhotosAction ? t('profile.manage') : undefined}
        onAction={showManagePhotosAction ? onManagePhotos : undefined}
      >
        <BusinessGallery photos={user.businessPhotos || []} />
      </Section>
    </>
  );

  return (
    <View style={styles.root}>
      <ProfileHeader user={user} chapterName={chapterName} />

      {headerSlot ? <View style={styles.headerSlot}>{headerSlot}</View> : null}

      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Membership</Text>
        <View style={[styles.statsCardsRow, cardsStacked && styles.statsCardsRowStacked]}>
          <Card
            style={StyleSheet.flatten([
              styles.statsCard,
              { backgroundColor: membershipTier.cardBackground },
            ])}
          >
            <View style={[styles.statsCardIcon, { backgroundColor: membershipTier.iconBackground }]}>
              <Ionicons name="medal-outline" size={22} color={membershipTier.color} />
            </View>
            <Text style={styles.statsCardLabel}>Membership Type</Text>
            <Text style={[styles.statsCardValue, { color: membershipTier.color }]}>
              {membershipTier.label}
            </Text>
          </Card>

          <Card style={styles.statsCard}>
            <View style={[styles.statsCardIcon, { backgroundColor: colors.primaryFaded }]}>
              <Ionicons name="star-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.statsCardLabel}>Points</Text>
            <Text style={[styles.statsCardValue, { color: colors.primary }]}>
              {totalPoints.toLocaleString('en-IN')}
            </Text>
          </Card>
        </View>
      </View>

      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Business</Text>
        <View style={[styles.statsCardsRow, cardsStacked && styles.statsCardsRowStacked]}>
          <Card style={styles.statsCard}>
            <View style={[styles.statsCardIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="arrow-up-circle-outline" size={22} color={colors.success} />
            </View>
            <Text style={styles.statsCardLabel}>Business Given</Text>
            <Text style={[styles.statsCardValue, { color: colors.success }]}>
              ₹{businessGiven.toLocaleString('en-IN')}
            </Text>
          </Card>
          <Card style={styles.statsCard}>
            <View style={[styles.statsCardIcon, { backgroundColor: colors.accentFaded }]}>
              <Ionicons name="arrow-down-circle-outline" size={22} color={colors.accent} />
            </View>
            <Text style={styles.statsCardLabel}>Business Received</Text>
            <Text style={[styles.statsCardValue, { color: colors.accent }]}>
              ₹{businessReceived.toLocaleString('en-IN')}
            </Text>
          </Card>
        </View>
      </View>

      {!isScrollLayout ? (
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
      ) : null}

      {isScrollLayout ? (
        <>
          {renderActivitySections()}
          {renderBusinessSections()}
        </>
      ) : (
        <>
          {activeTab === 'activity' ? renderActivitySections() : null}
          {activeTab === 'business' ? (
            <>
              {renderBusinessSections()}
              {businessTabFooter ?? (
                <View style={styles.actions}>
                  {onEditProfile ? (
                    <Button
                      title={t('profile.editProfile')}
                      onPress={onEditProfile}
                      icon="create-outline"
                      fullWidth
                      style={styles.editButton}
                    />
                  ) : null}
                  {onOpenSettings ? (
                    <Button
                      title={t('profile.settings')}
                      onPress={onOpenSettings}
                      icon="settings-outline"
                      variant="outline"
                      fullWidth
                    />
                  ) : null}
                </View>
              )}
            </>
          ) : null}
        </>
      )}

      {isScrollLayout
        ? businessTabFooter ?? (
            <View style={styles.actions}>
              {onEditProfile ? (
                <Button
                  title={t('profile.editProfile')}
                  onPress={onEditProfile}
                  icon="create-outline"
                  fullWidth
                  style={styles.editButton}
                />
              ) : null}
              {onOpenSettings ? (
                <Button
                  title={t('profile.settings')}
                  onPress={onOpenSettings}
                  icon="settings-outline"
                  variant="outline"
                  fullWidth
                />
              ) : null}
            </View>
          )
        : null}
    </View>
  );
};

function normalizeMeetingTimestamp(meeting: Meeting): string {
  if (meeting.createdAt) return meeting.createdAt;
  if (meeting.scheduledDate) {
    return meeting.scheduledDate.includes('T')
      ? meeting.scheduledDate
      : `${meeting.scheduledDate}T00:00:00`;
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
  root: {
    flex: 1,
  },
  headerSlot: {
    marginBottom: spacing.lg,
  },
  statsSection: {
    marginBottom: spacing.xl,
  },
  statsSectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statsCardsRowStacked: {
    flexDirection: 'column',
  },
  statsCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statsCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statsCardLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statsCardValue: {
    ...typography.h3,
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
    textAlign: 'center',
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
    flex: 1,
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
    gap: spacing.lg,
  },
  editButton: {
    marginBottom: 0,
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
});
