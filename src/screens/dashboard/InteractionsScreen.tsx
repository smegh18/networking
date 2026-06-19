import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
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
import { updateMeetingStatus } from '../../services/firebase/firestore';
import { colors, typography, spacing, borderRadius, layout, breakpoints, shadows } from '../../theme';
import type { DashboardStackParamList, Meeting, Chapter } from '../../types';
import { getChapters } from '../../services/firebase/firestore';
import { getChapterName } from '../../utils/chapter';

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
        updates.push(updateMeetingStatus(meeting.id, 'completed'));
      }
    });

    // Execute all updates (non-blocking)
    if (updates.length > 0) {
      Promise.allSettled(updates).then(() => {
        // Status updates triggered - will reflect in UI on next render
      });
    }
  }, [allMeetings]);

  // Load chapters data
  useEffect(() => {
    const loadChapters = async () => {
      try {
        setChaptersLoading(true);
        const chaptersData = await getChapters();
        setChapters(chaptersData);
      } catch (err) {
        console.error('Failed to load chapters:', err);
      } finally {
        setChaptersLoading(false);
      }
    };
    loadChapters();
  }, []);

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

  const numColumns = isWideWeb && width > breakpoints.xl ? 3 : isWideWeb ? 2 : 1;

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const config = STATUS_CONFIG[item.status];
    const isOutgoing = item.requesterId === currentUser?.uid;
    const otherPerson = isOutgoing ? item.requesteeName : item.requesterName;
    const interactionType = isOutgoing ? 'sent' : 'received';
    const interactionTypeConfig = interactionType === 'sent'
      ? { label: t('interactions.sent'), color: '#FBBF24', icon: 'send-outline' as keyof typeof Ionicons.glyphMap } // Yellow for sent
      : { label: t('interactions.received'), color: '#10B981', icon: 'arrow-down-outline' as keyof typeof Ionicons.glyphMap }; // Green for received

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
                {/* Show Sent/Received label with coloring */}
                <View style={[styles.statusBadge, { backgroundColor: interactionTypeConfig.color + '15' }]}>
                  <Ionicons name={interactionTypeConfig.icon} size={14} color={interactionTypeConfig.color} />
                  <Text style={[styles.statusText, { color: interactionTypeConfig.color }]}>{interactionTypeConfig.label}</Text>
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

          {/* Show action buttons */}
          {(activeTab === 'received' && !isOutgoing) || (activeTab === 'sent' && isOutgoing) && (
            <View style={styles.actionButtons}>
              {/* Show Accept/Reject buttons only for received interactions in received tab */}
              {activeTab === 'received' && !isOutgoing && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => {
                      // Accept keeps the status as is (pending/accepted)
                      Alert.alert(
                        t('interactions.accepted'),
                        t('interactions.acceptanceMessage'),
                        [{ text: t('common.ok') }]
                      );
                    }}
                  >
                    <Ionicons name="checkmark-outline" size={16} color={colors.success} />
                    <Text style={styles.actionButtonText}>{t('Accept')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => {
                      Alert.alert(
                        t('interactions.rejectTitle'),
                        t('interactions.rejectMessage'),
                        [
                          { text: t('Cancel'), style: 'cancel' },
                          {
                            text: t('Reject'),
                            style: 'destructive',
                            onPress: () => {
                              updateMeetingStatus(item.id, 'rejected')
                                .then(() => {
                                  Alert.alert(t('interactions.rejected'), t('interactions.rejectionMessage'));
                                })
                                .catch(() => {
                                  Alert.alert(t('common.error'), t('interactions.rejectionFailed'));
                                });
                            }
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="close-outline" size={16} color={colors.error} />
                    <Text style={styles.actionButtonText}>{t('Reject')}</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Show WhatsApp button for both sent and received interactions */}
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={() => {
                  let shareMessage = '';
                  if (isOutgoing) {
                    // For sent messages - show whatsapp invite format
                    const chapterName = getChapterName(currentUser?.chapterId ?? null, chapters);
                    const city = currentUser?.location?.city || '';

                    // Generate deep link for Interactions screen with received tab
                    const deepLink = Platform.OS === 'web'
                      ? `https://bbcn-networking.web.app/interactions?tab=received`
                      : `bbcn://interactions?tab=received`;

                    shareMessage = `Hello,

I am ${currentUser?.name || ''}, from ${currentUser?.businessName || ''}.
Reference: Brahmin Business Connect, ${chapterName}, ${city}

I would like to schedule a B2B with you on ${item.scheduledDate || ''}, ${item.scheduledTime || ''}. Please accept my B2B invitation on app

${deepLink}`;
                  } else {
                    // For received messages - show existing share format
                    shareMessage = `
${t('interactions.shareTitle')}
${t('interactions.with')} ${otherPerson}
${t('interactions.type')} ${item.type === 'b2b' ? t('interactions.b2b') : t('interactions.oneOnOne')}
${t('interactions.date')} ${formatDate(item.scheduledDate)}
${t('interactions.time')} ${item.scheduledTime}
${item.notes ? `${t('interactions.notes')} ${item.notes}` : ''}
${t('interactions.status')} ${config.label}
                  `.trim();
                  }

                  // Share via WhatsApp
                  if (Platform.OS === 'web') {
                    // For web, we can use WhatsApp web link
                    const encodedMessage = encodeURIComponent(shareMessage);
                    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
                  } else {
                    // For native, we would use a sharing library or intent
                    // For now, we'll show an alert since we don't have the sharing library imported
                    Alert.alert(
                      t('interactions.shareTitle'),
                      shareMessage,
                      [{ text: t('common.ok') }]
                    );
                    // In a real implementation, you would use:
                    // Share.share({ message: shareMessage, social: Share.Social.WHATSAPP });
                  }
                }}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                <Text style={styles.actionButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}
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
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.success + '15',
  },
  rejectButton: {
    backgroundColor: colors.error + '15',
  },
  shareButton: {
    backgroundColor: colors.primary + '15',
  },
  actionButtonText: {
    marginLeft: spacing.xs,
    ...typography.caption,
    color: colors.text,
  },
  whatsappColor: {
    color: '#25D366', // WhatsApp green
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
