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
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius, layout, breakpoints, shadows } from '../../theme';
import type { DashboardStackParamList, Meeting, Chapter } from '../../types';
import { updateRecord, fetchCollection } from '../../services/firebase/realtimeDb';
import { getChapterName } from '../../utils/chapter';
import { openWhatsAppWithMessage, shareToWhatsApp } from '../../utils/helpers';

type Props = StackScreenProps<DashboardStackParamList, 'Interactions'>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pending', color: '#F59E0B', icon: 'hourglass-outline' },
  accepted: { label: 'Accepted', color: '#3B82F6', icon: 'checkmark-outline' },
  rejected: { label: 'Rejected', color: '#EF4444', icon: 'close-outline' },
  completed: { label: 'Completed', color: '#10B981', icon: 'checkmark-done-outline' },
};

type TabFilter = 'sent' | 'received' | 'completed';

// ── Screen ─────────────────────────────────────────────────────────────────────

const InteractionsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width > breakpoints.lg;
  const [activeTab, setActiveTab] = useState<TabFilter>(route.params?.tab ?? 'sent');
  const currentUser = useAuthStore((s) => s.user);
  const { items: allMeetings, loading } = useRealtimeCollection<Meeting>('meetings');

  // Chapter data for WhatsApp message in sent cards
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [localStatuses, setLocalStatuses] = useState<Record<string, Meeting['status']>>({});

  // Compute user's meetings first so subsequent effects can reference them
  const meetings = useMemo(
    () =>
      allMeetings
        .filter((m) => m.requesterId === currentUser?.uid || m.requesteeId === currentUser?.uid)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allMeetings, currentUser?.uid],
  );

  const filteredMeetings = meetings.filter((m) => {
    if (activeTab === 'sent') return m.requesterId === currentUser?.uid;
    if (activeTab === 'received') return m.requesteeId === currentUser?.uid;
    if (activeTab === 'completed') return m.status === 'completed';
    return true;
  });

  // Auto-update status from pending/accepted to completed when time has passed
  useEffect(() => {
    const now = new Date();
    const updates: Promise<void>[] = [];

    allMeetings.forEach((meeting) => {
      // Skip if already completed or rejected
      if (meeting.status === 'completed' || meeting.status === 'rejected') return;

      // Check if scheduled time has passed
      const meetingDateTime = new Date(`${meeting.scheduledDate}T${meeting.scheduledTime}`);
      if (meetingDateTime <= now && (meeting.status === 'pending' || meeting.status === 'accepted')) {
        // Update status to completed
        updates.push(updateRecord(`meetings/${meeting.id}`, { status: 'completed' }));
      }
    });

    // Execute all updates (non-blocking)
    if (updates.length > 0) {
      Promise.allSettled(updates).then(() => {
        // Status updates triggered - will reflect in UI on next render
      });
    }
  }, [allMeetings]);

  // Mark all user meetings as viewed when they visit the screen
  useEffect(() => {
    if (!currentUser?.uid || meetings.length === 0) return;
    const unviewed = meetings.filter((meeting) => !meeting.viewedBy?.includes(currentUser.uid));
    if (unviewed.length === 0) return;

    const updates = unviewed.map((meeting) => {
      const newViewedBy = [...(meeting.viewedBy || []), currentUser.uid];
      return updateRecord(`meetings/${meeting.id}`, { viewedBy: newViewedBy });
    });
    Promise.allSettled(updates).then(() => {});
  }, [meetings, currentUser?.uid]);

  // Load chapters data
  useEffect(() => {
    const loadChapters = async () => {
      try {
        setChaptersLoading(true);
        const chaptersData = await fetchCollection<Chapter>('chapters');
        setChapters(chaptersData);
      } catch (err) {
        console.error('Failed to load chapters:', err);
      } finally {
        setChaptersLoading(false);
      }
    };
    loadChapters();
  }, []);

  const numColumns = isWideWeb && width > breakpoints.xl ? 3 : isWideWeb ? 2 : 1;

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const effectiveStatus = localStatuses[item.id] ?? item.status;
    const config = STATUS_CONFIG[effectiveStatus];
    const isOutgoing = item.requesterId === currentUser?.uid;
    const otherPerson = isOutgoing ? item.requesteeName : item.requesterName;
    const interactionType = isOutgoing ? 'sent' : 'received';
    const interactionTypeConfig = interactionType === 'sent'
      ? { label: t('interactions.sent'), color: '#FBBF24', icon: 'send-outline' as keyof typeof Ionicons.glyphMap } // Yellow for sent
      : { label: t('interactions.received'), color: '#10B981', icon: 'arrow-down-outline' as keyof typeof Ionicons.glyphMap }; // Green for received

    const handleStatusChange = async (nextStatus: 'accepted' | 'rejected') => {
      const previousStatus = effectiveStatus;
      setLocalStatuses((prev) => ({ ...prev, [item.id]: nextStatus }));

      try {
        await updateRecord(`meetings/${item.id}`, { status: nextStatus });
      } catch (err) {
        console.error('Failed to update meeting status', err);
        setLocalStatuses((prev) => ({ ...prev, [item.id]: previousStatus }));
        Alert.alert(t('common.error', 'Error'), t('interactions.statusUpdateFailed', 'Unable to update the interaction status right now.'));
      }
    };

    const handleShare = async () => {
      let shareMessage = '';
      if (isOutgoing) {
        const chapterName = getChapterName(currentUser?.chapterId ?? null, chapters);
        const city = currentUser?.location?.city || '';
        const deepLink = Platform.OS === 'web'
          ? 'https://bbcn-networking.web.app/interactions?tab=received'
          : 'bbcn://interactions?tab=received';

        shareMessage = [
          `Hello ${otherPerson || 'there'},`,
          '',
          `I am ${currentUser?.name || 'a member'} from ${currentUser?.businessName || 'my business'}.`,
          `I would like to schedule a B2B meeting with you on ${item.scheduledDate || ''} at ${item.scheduledTime || ''}.`,
          'Please let me know if this works for you.',
          '',
          `Reference: Brahmin Business Connect${chapterName ? ` • ${chapterName}` : ''}${city ? ` • ${city}` : ''}`,
          `App link: ${deepLink}`,
        ].join('\n');
      } else {
        shareMessage = [
          `${t('interactions.shareTitle', 'Meeting invite')}`,
          `${t('interactions.with', 'With')} ${otherPerson}`,
          `${t('interactions.type', 'Type')} ${item.type === 'b2b' ? t('interactions.b2b', 'B2B') : t('interactions.oneOnOne', '1-on-1')}`,
          `${t('interactions.date', 'Date')} ${formatDate(item.scheduledDate)}`,
          `${t('interactions.time', 'Time')} ${item.scheduledTime}`,
          item.notes ? `${t('interactions.notes', 'Notes')} ${item.notes}` : '',
          `${t('interactions.status', 'Status')} ${config.label}`,
        ].filter(Boolean).join('\n');
      }

      try {
        const shareUrl = shareToWhatsApp(shareMessage);
        await Linking.openURL(shareUrl);
      } catch (shareErr) {
        console.error('Failed to open WhatsApp for interaction share', shareErr);
        Alert.alert(t('common.error', 'Error'), t('interactions.whatsappOpenFailed', 'Unable to open WhatsApp right now.'));
      }
    };

    return (
      <View style={[isWideWeb && { flex: 1, maxWidth: `${100 / numColumns}%` as any, paddingHorizontal: spacing.sm }]}>
        <Card style={styles.meetingCard}>
          <View style={styles.meetingHeader}>
            <Avatar name={otherPerson} size="sm" />
            <View style={styles.meetingInfo}>
              <Text style={styles.personName} numberOfLines={1}>{otherPerson}</Text>
              <View style={styles.badgesRow}>
                <View style={styles.smallBadge}>
                  <Ionicons name={item.type === 'b2b' ? 'briefcase-outline' : 'person-outline'} size={12} color={colors.textSecondary} />
                  <Text style={styles.smallBadgeText}>{item.type === 'b2b' ? 'B2B' : '1-on-1'}</Text>
                </View>
                <View style={[styles.smallBadge, { backgroundColor: interactionTypeConfig.color + '15' }]}>
                  <Ionicons name={interactionTypeConfig.icon} size={12} color={interactionTypeConfig.color} />
                  <Text style={[styles.smallBadgeText, { color: interactionTypeConfig.color }]}>{interactionTypeConfig.label}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
              <Ionicons name={config.icon} size={14} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>

          <View style={styles.meetingDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.detailText}>
                {formatDate(item.scheduledDate)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={styles.detailText}>{item.scheduledTime}</Text>
            </View>
          </View>

          {item.notes ? (
            <Text style={styles.notes} numberOfLines={3}>{item.notes}</Text>
          ) : null}

          {/* Show action buttons */}
          {(activeTab === 'received' && !isOutgoing) || (activeTab === 'sent' && isOutgoing) ? (
            <View style={styles.actionButtonsContainer}>
              {activeTab === 'received' && !isOutgoing && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.acceptButton,
                      effectiveStatus === 'accepted' && styles.activeAcceptButton,
                      effectiveStatus !== 'pending' && styles.disabledActionButton,
                    ]}
                    disabled={effectiveStatus !== 'pending'}
                    onPress={() => handleStatusChange('accepted')}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={effectiveStatus === 'accepted' ? colors.success : colors.success} />
                    <Text style={[styles.actionButtonText, { color: colors.success }, effectiveStatus === 'accepted' && styles.activeActionText]}>
                      {effectiveStatus === 'accepted' ? t('interactions.accepted', 'Accepted') : t('interactions.accept', 'Accept')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                      effectiveStatus === 'rejected' && styles.activeRejectButton,
                      effectiveStatus !== 'pending' && styles.disabledActionButton,
                    ]}
                    disabled={effectiveStatus !== 'pending'}
                    onPress={() => handleStatusChange('rejected')}
                  >
                    <Ionicons name="close-circle" size={18} color={effectiveStatus === 'rejected' ? colors.error : colors.error} />
                    <Text style={[styles.actionButtonText, { color: colors.error }, effectiveStatus === 'rejected' && styles.activeActionText]}>
                      {effectiveStatus === 'rejected' ? t('interactions.rejected', 'Rejected') : t('interactions.reject', 'Reject')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShare}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                <Text style={[styles.actionButtonText, { color: '#25D366', fontWeight: '600' }]}>Share on WhatsApp</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Card>
      </View>
    );
  };

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'sent', label: t('interactions.sent') },
    { key: 'received', label: t('interactions.received') },
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
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  smallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceVariant,
    gap: 4,
  },
  smallBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...typography.captionMedium,
  },
  meetingDetails: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  actionButtonsContainer: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  acceptButton: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success + '30',
  },
  activeAcceptButton: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
  },
  activeRejectButton: {
    backgroundColor: colors.error + '20',
    borderColor: colors.error,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  shareButton: {
    backgroundColor: '#25D366' + '10',
    borderColor: '#25D366' + '30',
  },
  actionButtonText: {
    marginLeft: spacing.xs,
    ...typography.caption,
    color: colors.text,
  },
  activeActionText: {
    fontWeight: '700',
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
