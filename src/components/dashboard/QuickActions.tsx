import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, borderRadius, spacing, breakpoints, shadows } from '../../theme';

interface QuickActionsProps {
  onScheduleMeeting: () => void;
  onInteractions: () => void;
  onReferralStatus: () => void;
  onMyEvents: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onScheduleMeeting,
  onInteractions,
  onReferralStatus,
  onMyEvents,
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > breakpoints.lg;
  const isMobile = !isWeb;

  const actions = [
    { label: t('dashboard.scheduleMeeting'), icon: 'calendar-outline' as const, color: colors.primary, onPress: onScheduleMeeting },
    { label: t('dashboard.interactions'), icon: 'chatbubbles-outline' as const, color: colors.accent, onPress: onInteractions },
    { label: t('dashboard.referralStatus'), icon: 'git-network-outline' as const, color: colors.secondary, onPress: onReferralStatus },
    { label: t('dashboard.myEvents'), icon: 'megaphone-outline' as const, color: colors.success, onPress: onMyEvents },
  ];

  const renderActionCard = (action: typeof actions[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.card, isWeb && styles.webCard, isMobile && styles.mobileCard]}
      onPress={action.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: action.color + '15' }]}>
        <Ionicons name={action.icon} size={26} color={action.color} />
      </View>
      <Text style={styles.label} numberOfLines={2}>{action.label}</Text>

    </TouchableOpacity>
  );

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        {actions.map(renderActionCard)}
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.mobileGrid]}>

      {actions.map(renderActionCard)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  mobileGrid: {

    justifyContent: 'space-between',
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
    width: '48%',

  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  label: {
    ...typography.captionMedium,
    color: colors.text,
    textAlign: 'center',
  },

});
