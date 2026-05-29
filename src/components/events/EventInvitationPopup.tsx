import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
} from 'react-native';
import { TextInput } from '../../components/ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { useAuthStore } from '../../stores/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import { isCentralEvent, isEventVisibleToChapter } from '../../utils/eventAudience';
import type { Event, EventAttendanceDetail } from '../../types';

function isUpcomingEvent(event: Event): boolean {
  const date = new Date(event.date);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

export const EventInvitationPopup: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const { items: events } = useRealtimeCollection<Event>('events');
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubstituteForm, setShowSubstituteForm] = useState(false);
  const [substituteName, setSubstituteName] = useState('');
  const [substitutePhone, setSubstitutePhone] = useState('');
  const [substituteError, setSubstituteError] = useState('');

  const currentUserId = currentUser?.uid ?? '';
  const currentUserChapterId = currentUser?.chapterId ?? '';

  useEffect(() => {
    setDismissedForSession(false);
  }, [currentUser?.uid]);

  const pendingEvents = useMemo(() => {
    if (!currentUserId) return [];

    return events
      .filter((event) => {
        if (!isUpcomingEvent(event)) return false;
        if (!isEventVisibleToChapter(event, currentUserChapterId)) return false;
        const response = event.attendanceDetails?.[currentUserId];
        return !response?.status;
      })
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [currentUserChapterId, currentUserId, events]);

  const activeEvent = dismissedForSession ? null : pendingEvents[0] ?? null;

  if (!currentUserId || !activeEvent) {
    return null;
  }

  const handleRespond = async (status: 'attending' | 'not_attending' | 'substituted') => {
    if (!currentUserId) return;

    if (status === 'substituted') {
      const name = substituteName.trim();
      const phone = substitutePhone.replace(/\D/g, '');
      if (!name) {
        setSubstituteError('Substitute name is required');
        return;
      }
      if (phone.length < 10) {
        setSubstituteError('Valid 10-digit contact number is required');
        return;
      }
    }

    setIsSubmitting(true);
    setSubstituteError('');

    try {
      const attendees = Array.isArray(activeEvent.attendees) ? [...activeEvent.attendees] : [];
      let nextAttendees = attendees;

      if (status === 'attending') {
        nextAttendees = attendees.includes(currentUserId) ? attendees : [...attendees, currentUserId];
      } else {
        nextAttendees = attendees.filter((uid) => uid !== currentUserId);
      }

      const existingDetail = activeEvent.attendanceDetails?.[currentUserId] || {};
      const nextCount = status === 'substituted'
        ? ((existingDetail as any).substitutionCount ?? 0) + 1
        : ((existingDetail as any).substitutionCount);

      const nextDetails: Record<string, EventAttendanceDetail> = {
        ...(activeEvent.attendanceDetails || {}),
        [currentUserId]: {
          ...existingDetail,
          status,
          ...(status === 'substituted' ? {
            substituteName: substituteName.trim(),
            substitutePhone: substitutePhone.replace(/\D/g, ''),
            substitutionCount: nextCount,
          } : {}),
          updatedAt: new Date().toISOString(),
        },
      };

      await update(ref(rtdb, `events/${activeEvent.id}`), {
        attendees: nextAttendees,
        attendanceDetails: nextDetails,
        updatedAt: new Date().toISOString(),
      });

      if (status === 'substituted') {
        setDismissedForSession(true);
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={!!activeEvent}
      transparent
      animationType="fade"
      onRequestClose={() => setDismissedForSession(true)}
    >
      <TouchableWithoutFeedback onPress={() => setDismissedForSession(true)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modal, { padding: 0, overflow: 'hidden' }]}>
              {activeEvent.imageURL ? (
                <Image source={{ uri: activeEvent.imageURL }} style={styles.bannerImage} resizeMode="cover" />
              ) : null}

              <View style={styles.contentPadding}>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.badgeText}>
                      {isCentralEvent(activeEvent) ? 'Central Event' : 'Chapter Event'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.title}>{activeEvent?.title}</Text>
                <Text style={styles.meta}>
                  {formatPopupDate(activeEvent?.date || '')}
                  {activeEvent?.time ? ` • ${activeEvent.time}` : ''}
                </Text>
                <Text style={styles.location}>{activeEvent?.location || 'Location to be announced'}</Text>
                <Text style={styles.description}>{activeEvent?.description || 'Would you like to join this event?'}</Text>

                {showSubstituteForm ? (
                  <View style={styles.substituteForm}>
                    <TextInput
                      label="Substitute name"
                      placeholder="Full name"
                      value={substituteName}
                      onChangeText={(v) => { setSubstituteName(v); setSubstituteError(''); }}
                      icon="person-outline"
                    />
                    <TextInput
                      label="Contact number"
                      placeholder="10-digit number"
                      value={substitutePhone}
                      onChangeText={(v) => { setSubstitutePhone(v.replace(/\D/g, '').slice(0, 10)); setSubstituteError(''); }}
                      icon="call-outline"
                      keyboardType="phone-pad"
                      maxLength={10}
                      error={substituteError}
                      containerStyle={styles.substituteField}
                    />
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton, isSubmitting && styles.disabledButton]}
                        onPress={() => setShowSubstituteForm(false)}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rejectText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton, isSubmitting && styles.disabledButton]}
                        onPress={() => handleRespond('substituted')}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.acceptText}>{isSubmitting ? 'Saving...' : 'Confirm'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton, isSubmitting && styles.disabledButton]}
                      onPress={() => handleRespond('not_attending')}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rejectText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.substituteButton, isSubmitting && styles.disabledButton]}
                      onPress={() => setShowSubstituteForm(true)}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.substituteText}>Substitute</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton, isSubmitting && styles.disabledButton]}
                      onPress={() => handleRespond('attending')}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.acceptText}>{isSubmitting ? 'Saving...' : 'Accept'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

function formatPopupDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modal: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  bannerImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surfaceVariant,
  },
  contentPadding: {
    padding: spacing.xl,
  },
  badgeRow: {
    marginBottom: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  meta: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  location: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  rejectButton: {
    backgroundColor: colors.errorLight,
  },
  substituteButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  rejectText: {
    ...typography.bodySmallMedium,
    color: colors.error,
  },
  substituteText: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
  },
  acceptText: {
    ...typography.bodySmallMedium,
    color: colors.textInverse,
  },
  disabledButton: {
    opacity: 0.7,
  },
  substituteForm: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  substituteField: {
    marginTop: spacing.md,
  },
});
