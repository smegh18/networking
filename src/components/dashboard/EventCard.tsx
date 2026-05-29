import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '../../theme';
import { Event, EventAttendanceStatus } from '../../types';
import { useAuthStore } from '../../stores/authStore';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

const ATTENDANCE_COLORS: Record<EventAttendanceStatus, string> = {
  attending: colors.success,
  not_attending: colors.error,
  substituted: colors.warning,
};

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const { t } = useTranslation();
  const uid = useAuthStore((s) => s.user?.uid ?? '');
  const detail = event.attendanceDetails?.[uid];
  const status: EventAttendanceStatus = detail?.status ?? 'not_attending';

  const typeColors: Record<string, string> = {
    meeting: colors.info,
    event: colors.accent,
    webinar: colors.success,
  };

  const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    meeting: 'people-outline',
    event: 'calendar-outline',
    webinar: 'videocam-outline',
  };

  const statusLabel =
    status === 'attending'
      ? t('events.attending', 'Attending')
      : status === 'substituted'
        ? t('events.substitute', 'Substitute')
        : t('events.notAttending', 'Not attending');
  const statusColor = ATTENDANCE_COLORS[status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.dateStrip, { backgroundColor: typeColors[event.type] || colors.primary }]}>
        <Text style={styles.dateDay}>
          {new Date(event.date).getDate()}
        </Text>
        <Text style={styles.dateMonth}>
          {new Date(event.date).toLocaleString('en', { month: 'short' })}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.typeBadge, { backgroundColor: (typeColors[event.type] || colors.primary) + '15' }]}>
            <Ionicons name={typeIcons[event.type] || 'calendar-outline'} size={12} color={typeColors[event.type] || colors.primary} />
            <Text style={[styles.typeText, { color: typeColors[event.type] || colors.primary }]}>
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </Text>
          </View>
          <View style={[styles.attendanceBadge, { backgroundColor: statusColor }]}>
            <Text
              style={[styles.attendanceText, status === 'substituted' && styles.attendanceTextDark]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText}>{event.time}</Text>
          <Ionicons name="location-outline" size={14} color={colors.textTertiary} style={styles.metaIcon} />
          <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateStrip: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  dateDay: {
    ...typography.h2,
    color: colors.textInverse,
  },
  dateMonth: {
    ...typography.captionMedium,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  attendanceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    maxWidth: '48%',
  },
  attendanceText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textInverse,
  },
  attendanceTextDark: {
    color: '#78350f',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    gap: 4,
  },
  typeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  title: {
    ...typography.bodySemiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: 4,
    flex: 0,
  },
  metaIcon: {
    marginLeft: spacing.md,
  },
});
