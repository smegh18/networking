import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share, Linking, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Section } from '../../components/layout/Section';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { isEventVisibleToChapter } from '../../utils/eventAudience';
import type { DashboardStackParamList, Event, EventAttendanceStatus, EventAttendanceDetail } from '../../types';

const MAX_SUBSTITUTIONS = 2;

type Props = StackScreenProps<DashboardStackParamList, 'EventDetail'>;

const TYPE_COLORS: Record<string, string> = {
  meeting: colors.info,
  event: colors.accent,
  webinar: colors.success,
};

const EventDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { eventId } = route.params;
  const currentUser = useAuthStore((s) => s.user);
  const { items: events } = useRealtimeCollection<Event>('events');
  const event = useMemo(() => events.find((item) => item.id === eventId) ?? null, [eventId, events]);
  const typeColor = TYPE_COLORS[event?.type || 'event'] || colors.primary;

  const uid = currentUser?.uid ?? '';
  const detail = event?.attendanceDetails?.[uid];
  const attendanceRecord = event?.attendanceRecords?.[uid];
  const inAttendees = !!(event && uid && event.attendees?.includes(uid));
  const status: EventAttendanceStatus = detail?.status ?? (inAttendees ? 'attending' : 'not_attending');
  const substitutionCount = detail?.substitutionCount ?? 0;
  const canSubstitute = substitutionCount < MAX_SUBSTITUTIONS;
  const today = new Date().toISOString().split('T')[0];
  const eventDay = (event?.date || '').split('T')[0];
  const isEventDay = !!eventDay && eventDay === today;
  const attendanceAlreadyMarked = !!attendanceRecord && attendanceRecord.status !== 'absent';

  const [showSubstituteForm, setShowSubstituteForm] = useState(false);
  const [substituteName, setSubstituteName] = useState('');
  const [substitutePhone, setSubstitutePhone] = useState('');
  const [substituteError, setSubstituteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `${event.title}\n${event.date} ${event.time}\n${event.location}`,
      });
    } catch {}
  };

  const handleOpenMap = async () => {
    if (!event?.location) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'), t('events.openMapFailed', 'Unable to open map'));
    }
  };

  const now = () => new Date().toISOString();

  const handleSetAttending = async () => {
    if (!event?.id || !uid) return;
    const attendees = Array.isArray(event.attendees) ? [...event.attendees] : [];
    const nextAttendees = attendees.includes(uid) ? attendees : [...attendees, uid];
    const details = { ...(event.attendanceDetails || {}) };
    details[uid] = { status: 'attending', updatedAt: now() };
    setShowSubstituteForm(false);
    try {
      await update(ref(rtdb, `events/${event.id}`), {
        attendees: nextAttendees,
        attendanceDetails: details,
        updatedAt: now(),
      });
    } catch {
      Alert.alert(t('common.error'), t('events.rsvpFailed', 'Unable to update RSVP'));
    }
  };

  const handleSetNotAttending = async () => {
    if (!event?.id || !uid) return;
    const attendees = Array.isArray(event.attendees) ? [...event.attendees] : [];
    const nextAttendees = attendees.filter((id) => id !== uid);
    const details = { ...(event.attendanceDetails || {}) };
    details[uid] = { status: 'not_attending', updatedAt: now() };
    setShowSubstituteForm(false);
    try {
      await update(ref(rtdb, `events/${event.id}`), {
        attendees: nextAttendees,
        attendanceDetails: details,
        updatedAt: now(),
      });
    } catch {
      Alert.alert(t('common.error'), t('events.rsvpFailed', 'Unable to update RSVP'));
    }
  };

  const handleSubstitutePress = () => {
    if (!canSubstitute) return;
    setShowSubstituteForm(true);
    setSubstituteName(detail?.substituteName ?? '');
    setSubstitutePhone(detail?.substitutePhone ?? '');
    setSubstituteError('');
  };

  const handleSubstituteSubmit = async () => {
    const name = substituteName.trim();
    const phone = substitutePhone.replace(/\D/g, '');
    if (!name) {
      setSubstituteError(t('events.substituteNameRequired', 'Substitute name is required'));
      return;
    }
    if (phone.length < 10) {
      setSubstituteError(t('events.substitutePhoneRequired', 'Valid 10-digit contact number is required'));
      return;
    }
    if (!event?.id || !uid) return;
    setIsSubmitting(true);
    setSubstituteError('');
    const attendees = Array.isArray(event.attendees) ? [...event.attendees] : [];
    const nextAttendees = attendees.filter((id) => id !== uid);
    const details = { ...(event.attendanceDetails || {}) };
    const nextCount = (detail?.substitutionCount ?? 0) + 1;
    details[uid] = {
      status: 'substituted',
      substituteName: name,
      substitutePhone: phone,
      substitutionCount: nextCount,
      updatedAt: now(),
    };
    try {
      await update(ref(rtdb, `events/${event.id}`), {
        attendees: nextAttendees,
        attendanceDetails: details,
        updatedAt: now(),
      });
      setShowSubstituteForm(false);
      setSubstituteName('');
      setSubstitutePhone('');
    } catch {
      Alert.alert(t('common.error'), t('events.rsvpFailed', 'Unable to save substitution'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) {
    return (
      <ScreenWrapper>
        <Header title={t('events.eventDetail')} onBack={() => navigation.goBack()} />
        <EmptyState icon="calendar-outline" title={t('events.noEvents')} message={t('events.noEventsMessage')} />
      </ScreenWrapper>
    );
  }

  if (!isEventVisibleToChapter(event, currentUser?.chapterId)) {
    return (
      <ScreenWrapper>
        <Header title={t('events.eventDetail')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="lock-closed-outline"
          title={t('events.noEvents', 'Event unavailable')}
          message="This event is not available for your chapter."
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false}>
      <Header
        title={t('events.eventDetail')}
        onBack={() => navigation.goBack()}
        rightAction={{ icon: 'share-outline', onPress: handleShare }}
      />

      <View style={styles.bannerContainer}>
        <Image
          source={{
            uri: event.imageURL || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
          }}
          style={styles.banner}
          resizeMode="cover"
        />
        <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
          <Text style={styles.typeBadgeText}>{event.type?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>

        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{t('events.date')}</Text>
              <Text style={styles.detailValue}>
                {new Date(event.date).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{t('events.time')}</Text>
              <Text style={styles.detailValue}>{event.time}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.detailRow} onPress={handleOpenMap}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{t('events.location')}</Text>
              <Text style={[styles.detailValue, styles.locationLink]}>{event.location}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.primary} style={styles.openIcon} />
          </TouchableOpacity>
        </Card>

        <Section title={t('events.organizer')}>
          <View style={styles.organizerRow}>
            <Avatar name={event.organizerName} size="sm" />
            <Text style={styles.organizerName}>{event.organizerName}</Text>
          </View>
        </Section>

        <Section title={t('events.attendees')}>
          <View style={styles.attendeesRow}>
            <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.attendeesText}>
              {(event.attendees || []).length} {t('events.attendeesCount')}
            </Text>
          </View>
          {event.checkedInUsers?.length ? (
            <View style={styles.attendeesRow}>
              <Ionicons name="scan-outline" size={20} color={colors.success} />
              <Text style={styles.attendeesText}>
                {event.checkedInUsers.length} {t('events.presentCount', 'checked in')}
              </Text>
            </View>
          ) : null}
        </Section>

        <Section title={t('events.description')}>
          <Text style={styles.description}>{event.description}</Text>
        </Section>

        {currentUser ? (
          <Section title={t('events.markAttendance', 'Mark attendance')}>
            {!isEventDay ? (
              <Card style={styles.scanCard}>
                <View style={styles.scanHeader}>
                  <View style={styles.qrTextWrap}>
                    <Text style={styles.qrTitle}>{t('events.scanAvailableOnEventDay', 'Available on event day')}</Text>
                    <Text style={styles.qrSubtitle}>
                      {t('events.scanOnlyOnEventDayHint', 'Attendance scanning is enabled only on the event date.')}
                    </Text>
                  </View>
                  <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
                </View>
                <Text style={styles.scanMetaText}>
                  {t('events.eventDate', 'Event date')}: {eventDay || '-'}
                </Text>
              </Card>
            ) : attendanceAlreadyMarked ? (
              <Card style={styles.scanCard}>
                <View style={styles.scanHeader}>
                  <View style={styles.qrTextWrap}>
                    <Text style={styles.qrTitle}>{t('events.attendanceMarked', 'Attendance marked')}</Text>
                    <Text style={styles.qrSubtitle}>
                      {t('events.attendanceAlreadyMarkedHint', 'You have already marked attendance for this event.')}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                </View>
                <Button
                  title={t('events.attendanceMarked', 'Attendance marked')}
                  onPress={() => {}}
                  disabled
                  fullWidth
                  size="sm"
                  icon="checkmark-circle-outline"
                />
              </Card>
            ) : (
              <Card style={styles.scanCard}>
                <View style={styles.scanHeader}>
                  <View style={styles.qrTextWrap}>
                    <Text style={styles.qrTitle}>{currentUser.name}</Text>
                    <Text style={styles.qrSubtitle}>
                      {t('events.scanAdminQrHint', 'Tap below to open the scanner, then scan the QR shown by the admin for this event.')}
                    </Text>
                  </View>
                  <Ionicons name="scan-outline" size={22} color={colors.primary} />
                </View>

                <Button
                  title={t('events.scanEventQr', 'Scan event QR')}
                  onPress={() => navigation.navigate('EventAttendanceScanner', { eventId: event.id })}
                  fullWidth
                  size="sm"
                  icon="scan-outline"
                />
              </Card>
            )}
          </Section>
        ) : null}

        <Section title={t('events.yourResponse', 'Your response')}>
          <View style={styles.rsvpRow}>
            <Button
              title={t('events.attending', 'Attending')}
              onPress={handleSetAttending}
              icon="checkmark-circle-outline"
              variant={status === 'attending' ? 'primary' : 'outline'}
              size="sm"
              style={styles.rsvpOption}
            />
            <Button
              title={t('events.notAttending', 'Not attending')}
              onPress={handleSetNotAttending}
              icon="close-circle-outline"
              variant={status === 'not_attending' ? 'primary' : 'outline'}
              size="sm"
              style={styles.rsvpOption}
            />
            <Button
              title={t('events.substitute', 'Substitute') + (canSubstitute ? ` (${MAX_SUBSTITUTIONS - substitutionCount})` : '')}
              onPress={handleSubstitutePress}
              icon="person-add-outline"
              variant={status === 'substituted' ? 'primary' : 'outline'}
              size="sm"
              disabled={!canSubstitute}
              style={styles.rsvpOption}
            />
          </View>

          {showSubstituteForm && canSubstitute ? (
            <View style={styles.substituteForm}>
              <Text style={styles.substituteFormTitle}>
                {t('events.substituteDetails', 'Substitute details')}
              </Text>
              <TextInput
                label={t('events.substituteName', 'Substitute name')}
                placeholder={t('events.substituteNamePlaceholder', 'Full name')}
                value={substituteName}
                onChangeText={(v) => { setSubstituteName(v); setSubstituteError(''); }}
                icon="person-outline"
              />
              <TextInput
                label={t('events.substituteContact', 'Contact number')}
                placeholder={t('events.substituteContactPlaceholder', '10-digit number')}
                value={substitutePhone}
                onChangeText={(v) => { setSubstitutePhone(v.replace(/\D/g, '').slice(0, 10)); setSubstituteError(''); }}
                icon="call-outline"
                keyboardType="phone-pad"
                maxLength={10}
                error={substituteError}
                containerStyle={styles.substituteField}
              />
              <Button
                title={t('events.confirmSubstitution', 'Confirm substitution')}
                onPress={handleSubstituteSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
                fullWidth
                size="sm"
              />
            </View>
          ) : null}
        </Section>

        {attendanceRecord ? (
          <Section title={t('events.attendanceRecorded', 'Attendance recorded')}>
            <View style={styles.attendanceRecordRow}>
              <Ionicons
                name={
                  attendanceRecord.status === 'present'
                    ? 'checkmark-circle-outline'
                    : attendanceRecord.status === 'late'
                      ? 'time-outline'
                      : 'close-circle-outline'
                }
                size={20}
                color={
                  attendanceRecord.status === 'present'
                    ? colors.success
                    : attendanceRecord.status === 'late'
                      ? colors.warning
                      : colors.error
                }
              />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>
                  {attendanceRecord.status === 'present'
                    ? t('events.present', 'Present')
                    : attendanceRecord.status === 'late'
                      ? t('events.late', 'Late')
                    : t('events.absent', 'Absent')}
                </Text>
                <Text style={styles.detailValue}>
                  {new Date(attendanceRecord.recordedAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                <Text style={styles.recordedMeta}>
                  {attendanceRecord.source === 'scanner'
                    ? t('events.recordedByScanner', 'Recorded via scanner')
                    : attendanceRecord.source === 'self'
                      ? t('events.recordedBySelf', 'Recorded by you')
                      : t('events.recordedManually', 'Recorded manually')}
                </Text>
              </View>
            </View>
          </Section>
        ) : null}
      </View>
    </ScreenWrapper>
  );
};

export default EventDetailScreen;

const styles = StyleSheet.create({
  bannerContainer: {
    height: 220,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceVariant,
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typeBadgeText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  detailsCard: {
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  locationLink: {
    color: colors.primary,
  },
  openIcon: {
    alignSelf: 'center',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  organizerName: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attendeesText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  attendanceRecordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  scanCard: {
    gap: spacing.lg,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  scanMetaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  qrTextWrap: {
    flex: 1,
  },
  qrTitle: {
    ...typography.bodySemiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  qrSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  rsvpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rsvpOption: {
    flex: 1,
    minWidth: 100,
  },
  substituteForm: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  substituteFormTitle: {
    ...typography.bodySemiBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  recordedMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  substituteField: {
    marginTop: spacing.md,
  },
});
