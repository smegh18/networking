import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import { colors, typography, borderRadius, spacing, breakpoints, shadows } from '../../theme';

interface QuickActionsProps {
  onScheduleMeeting: () => void;
  onInteractions: () => void;
  onReferralStatus: () => void;
  onMyEvents: () => void;
  interactionCount?: number;
  myEventsCount?: number;
  referralCount?: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onScheduleMeeting,
  onInteractions,
  onReferralStatus,
  onMyEvents,
  interactionCount = 0,
  myEventsCount = 0,
  referralCount = 0,
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > breakpoints.lg;
  const isMobile = !isWeb;

  const actions = [
    { label: t('dashboard.scheduleMeeting'), icon: 'calendar-outline' as const, color: colors.primary, onPress: onScheduleMeeting },
    { label: t('dashboard.interactions'), icon: 'chatbubbles-outline' as const, color: colors.accent, onPress: onInteractions, badgeCount: interactionCount },
    { label: t('dashboard.referralStatus'), icon: 'git-network-outline' as const, color: colors.secondary, onPress: onReferralStatus, badgeCount: referralCount },
    { label: t('dashboard.myEvents'), icon: 'megaphone-outline' as const, color: colors.success, onPress: onMyEvents, badgeCount: myEventsCount },
  ];

  const renderActionCard = (action: (typeof actions)[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.card, isWeb && styles.webCard, isMobile && styles.mobileCard]}
      onPress={action.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.badgeAnchor}>
        <View
          style={[
            styles.iconContainer,
            isMobile && styles.iconContainerMobile,
            { backgroundColor: action.color + '15' },
          ]}
        >
          <Ionicons name={action.icon} size={isMobile ? 18 : 26} color={action.color} />
        </View>
        {action.badgeCount ? <Badge count={action.badgeCount} size="sm" style={styles.badge} /> : null}
      </View>
      <Text style={[styles.label, isMobile && styles.labelMobile]} numberOfLines={2}>
        {action.label}
      </Text>
    </TouchableOpacity>
  );

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        {actions.map(renderActionCard)}
      </View>
    );
  }

  return <View style={styles.mobileRow}>{actions.map(renderActionCard)}</View>;
};

const styles = StyleSheet.create({
  mobileRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  webContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    width: 120,
    minHeight: 120,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  webCard: {
    flex: 1,
    width: undefined,
    minWidth: 100,
    paddingVertical: spacing.xl,
  },
  mobileCard: {
    flex: 1,
    minWidth: 0,
    width: undefined,
    minHeight: 72,
    marginHorizontal: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  badgeAnchor: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerMobile: {
    width: 32,
    height: 32,
    marginBottom: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
  },
  label: {
    ...typography.captionMedium,
    color: colors.text,
    textAlign: 'center',
  },
  labelMobile: {
    fontSize: 9,
    lineHeight: 12,
  },
});
