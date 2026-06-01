import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, useWindowDimensions, ActivityIndicator, Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { updateRecord } from '../../services/firebase/realtimeDb';
import { colors, typography, spacing, borderRadius, layout, breakpoints, shadows } from '../../theme';
import type { DashboardStackParamList, Meeting, User } from '../../types';
import { openWhatsAppWithMessage } from '../../utils/helpers';

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
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const currentUser = useAuthStore((s) => s.user);
  const { items: allMeetings, loading } = useRealtimeCollection<Meeting>('meetings');
  const { items: allUsers } = useRealtimeCollection<User>('users', 'uid');

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

  const handleUpdateStatus = async (meetingId: string, status: Meeting['status']) => {
    try {
      setProcessingId(meetingId);
      await updateRecord(`meetings/${meetingId}`, { status, updatedAt: new Date().toISOString() } as any);
    } catch (err) {
      console.error('Failed to update meeting status:', err);
      Alert.alert(t('common.error'), t('interactions.updateFailed', 'Failed to update meeting status.'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleShareWhatsApp = (item: Meeting) => {
    const isOutgoing = item.requesterId === currentUser?.uid;
    const otherUserId = isOutgoing ? item.requesteeId : item.requesterId;
    const otherUser = allUsers.find(u => u.uid === otherUserId);
    
    if (!otherUser?.phone) {
      Alert.alert(t('common.error'), t('interactions.noPhone', 'Contact number not available for this user.'));
      return;
    }

    const message = t('interactions.waShareMessage', {
      defaultValue: `Hi ${otherUser.name}, I'd like to discuss our ${item.type === 'b2b' ? 'B2B' : '1-on-1'} meeting scheduled for ${formatDate(item.scheduledDate)} at ${item.scheduledTime}.`,
      name: otherUser.name,
      type: item.type === 'b2b' ? 'B2B' : '1-on-1',
      date: formatDate(item.scheduledDate),
      time: item.scheduledTime
    });

    Linking.openURL(openWhatsAppWithMessage(otherUser.phone, message));
  };

  const numColumns = isWideWeb && width > breakpoints.xl ? 3 : isWideWeb ? 2 : 1;

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const config = STATUS_CONFIG[item.status];
    const isOutgoing = item.requesterId === currentUser?.uid;
    const isIncoming = item.requesteeId === currentUser?.uid;
    const otherPerson = isOutgoing ? item.requesteeName : item.requesterName;
    const isPending = item.status === 'pending';
    const isBusy = processingId === item.id;

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

          <View style={styles.actionRow}>
            {isIncoming && isPending && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.acceptButton]} 
                  onPress={() => handleUpdateStatus(item.id, 'accepted')}
                  disabled={isBusy}
                >
                  <Ionicons name="checkmark-outline" size={16} color="#fff" />
                  <Text style={styles.acceptButtonText}>{t('common.accept', 'Accept')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.rejectButton]} 
                  onPress={() => handleUpdateStatus(item.id, 'rejected')}
                  disabled={isBusy}
                >
                  <Ionicons name="close-outline" size={16} color={colors.error} />
                  <Text style={styles.rejectButtonText}>{t('common.reject', 'Reject')}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity 
              style={[styles.actionButton, styles.waButton]} 
              onPress={() => handleShareWhatsApp(item)}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              <Text style={styles.waButtonText}>{t('common.share', 'WhatsApp')}</Text>
            </TouchableOpacity>
          </View>
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
  actionRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    flex: 1,
    minWidth: 100,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  acceptButtonText: {
    ...typography.captionSemiBold,
    color: '#fff',
  },
  rejectButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
  },
  rejectButtonText: {
    ...typography.captionSemiBold,
    color: colors.error,
  },
  waButton: {
    backgroundColor: '#25D36615',
    borderWidth: 1,
    borderColor: '#25D366',
  },
  waButtonText: {
    ...typography.captionSemiBold,
    color: '#128C7E',
  },
});
