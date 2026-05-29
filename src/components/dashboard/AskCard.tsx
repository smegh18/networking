import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { Ask } from '../../types';

interface AskCardProps {
  ask: Ask;
  chapterName?: string;
  onGiveReferral?: (ask: Ask) => void;
  onSchedule?: (ask: Ask) => void;
}

export const AskCard: React.FC<AskCardProps> = ({ ask, chapterName, onGiveReferral, onSchedule }) => {
  const { t } = useTranslation();

  const handleCall = () => {
    Linking.openURL(`tel:${ask.askerPhone}`);
  };

  const handleWhatsApp = () => {
    const phone = ask.askerWhatsapp.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${phone}`);
  };

  const timeAgo = getTimeAgo(ask.createdAt);

  return (
    <Card style={styles.card}>
      {/* Header: service badge + time */}
      <View style={styles.header}>
        <View style={styles.serviceBadge}>
          <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
          <Text style={styles.serviceBadgeText}>{ask.service}</Text>
        </View>
        <Text style={styles.timeText}>{timeAgo}</Text>
      </View>

      {/* Category */}
      <View style={styles.categoryRow}>
        <Ionicons name="pricetag-outline" size={12} color={colors.textTertiary} />
        <Text style={styles.categoryText}>{ask.category}</Text>
      </View>

      {/* Chapter */}
      {chapterName ? (
        <View style={styles.chapterRow}>
          <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.chapterText}>{chapterName}</Text>
        </View>
      ) : null}

      {/* Description */}
      <Text style={styles.description} numberOfLines={3}>
        {ask.description}
      </Text>

      {/* Asker info */}
      <View style={styles.askerRow}>
        <Avatar name={ask.askerName} size="xs" />
        <View style={styles.askerInfo}>
          <Text style={styles.askerName}>{ask.askerName}</Text>
          <Text style={styles.askerBusiness}>{ask.askerBusinessName}</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => onGiveReferral?.(ask)}
        >
          <Ionicons name="hand-right-outline" size={14} color={colors.textInverse} />
          <Text style={styles.actionBtnPrimaryText}>{t('ask.giveReferral')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => onSchedule?.(ask)}
        >
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={styles.actionBtnOutlineText}>{t('ask.scheduleOneOnOne')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={18} color={colors.success} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  serviceBadgeText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  timeText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  chapterText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  askerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  askerInfo: {
    flex: 1,
  },
  askerName: {
    ...typography.captionMedium,
    color: colors.text,
  },
  askerBusiness: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionBtnPrimaryText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  actionBtnOutlineText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
