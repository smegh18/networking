import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius, layout, breakpoints, shadows } from '../../theme';
import type { DashboardStackParamList, Meeting } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'Interactions'>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pending', color: '#F59E0B', icon: 'hourglass-outline' },
  accepted: { label: 'Accepted', color: '#3B82F6', icon: 'checkmark-outline' },
  rejected: { label: 'Rejected', color: '#EF4444', icon: 'close-outline' },
  completed: { label: 'Completed', color: '#10B981', icon: 'checkmark-done-outline' },
};

type TabFilter = 'all' | 'pending' | 'completed';

// ── Screen ─────────────────────────────────────────────────────────────────────

const InteractionsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width > breakpoints.lg;
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const currentUser = useAuthStore((s) => s.user);
  const { items: allMeetings, loading } = useRealtimeCollection<Meeting>('meetings');

  const meetings = useMemo(
    () =>
      allMeetings
        .filter((m) => m.requesterId === currentUser?.uid || m.requesteeId === currentUser?.uid)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allMeetings, currentUser?.uid],
  );

  const filteredMeetings = meetings.filter((m) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return m.status === 'pending' || m.status === 'accepted';
    if (activeTab === 'completed') return m.status === 'completed';
    return true;
  });

  const numColumns = isWideWeb && width > breakpoints.xl ? 3 : isWideWeb ? 2 : 1;

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const config = STATUS_CONFIG[item.status];
    const isOutgoing = item.requesterId === currentUser?.uid;
    const otherPerson = isOutgoing ? item.requesteeName : item.requesterName;

    return (
      <View style={[isWideWeb && { flex: 1, maxWidth: `${100 / numColumns}%` as any, paddingHorizontal: spacing.sm }]}>
        <Card style={styles.meetingCard}>
          <View style={styles.meetingHeader}>
            <Avatar name={otherPerson} size="sm" />
            <View style={styles.meetingInfo}>
              <Text style={styles.personName}>{otherPerson}</Text>
              <View style={styles.typeRow}>
                <Ionicons name={item.type === 'b2b' ? 'briefcase-outline' : 'person-outline'} size={13} color={colors.textTertiary} />
                <Text style={styles.typeText}>{item.type === 'b2b' ? 'B2B' : '1-on-1'}</Text>
                <Text style={styles.directionText}>{isOutgoing ? t('interactions.sent') : t('interactions.received')}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
              <Ionicons name={config.icon} size={14} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          <View style={styles.meetingDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.detailText}>
                {formatDate(item.scheduledDate)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
              <Text style={styles.detailText}>{item.scheduledTime}</Text>
            </View>
          </View>

          {item.notes ? (
            <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
          ) : null}
        </Card>
      </View>
    );
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: t('interactions.all') },
    { key: 'pending', label: t('interactions.pending') },
    { key: 'completed', label: t('interactions.completed') },
  ];

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <Header title={t('interactions.title')} onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <View style={[styles.tabBar, isWideWeb && styles.webTabBar]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={filteredMeetings}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          renderItem={renderMeeting}
          contentContainerStyle={[styles.listContent, isWideWeb && styles.webListContent]}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="chatbubbles-outline" title={t('interactions.noInteractions')} message={t('interactions.noInteractionsMessage')} />
          }
        />
      )}
    </ScreenWrapper>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default InteractionsScreen;

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  webTabBar: {
    marginHorizontal: layout.webPadding,
    maxWidth: 480,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  tabText: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['4xl'],
  },
  webListContent: {
    paddingHorizontal: spacing.lg,
  },
  columnWrapper: {
    gap: 0,
  },
  meetingCard: {
    marginBottom: spacing.lg,
  },
  meetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meetingInfo: {
    flex: 1,
    marginLeft: spacing.lg,
    marginRight: spacing.sm,
  },
  personName: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  typeText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  directionText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusText: {
    ...typography.captionMedium,
  },
  meetingDetails: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  notes: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
