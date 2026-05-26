import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../../theme';
import { AppNotification } from '../../types';
import { formatDate } from '../../utils/helpers';

interface NotificationItemProps {
  notification: AppNotification;
  onPress: () => void;
  onBirthdayWishPress?: () => void;
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  birthday: { icon: 'gift-outline', color: '#EC4899' },
  event: { icon: 'calendar-outline', color: '#8B5CF6' },
  meeting: { icon: 'people-outline', color: '#3B82F6' },
  referral: { icon: 'git-network-outline', color: '#10B981' },
  system: { icon: 'notifications-outline', color: '#F59E0B' },
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onBirthdayWishPress,
}) => {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const showBirthdayAction = notification.type === 'birthday' && !!onBirthdayWishPress;

  return (
    <TouchableOpacity
      style={[styles.container, !notification.read && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
        <Ionicons name={config.icon} size={22} color={config.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, !notification.read && styles.titleBold]} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        <Text style={styles.time}>{formatDate(notification.createdAt)}</Text>
      </View>
      {showBirthdayAction ? (
        <TouchableOpacity
          style={styles.birthdayWishButton}
          onPress={(event) => {
            event.stopPropagation();
            onBirthdayWishPress?.();
          }}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#15803D" />
        </TouchableOpacity>
      ) : null}
      {!notification.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  unread: {
    backgroundColor: colors.primaryFaded + '40',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  title: {
    ...typography.bodySmall,
    color: colors.text,
  },
  titleBold: {
    fontWeight: '600',
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  birthdayWishButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    marginTop: spacing.xs,
    marginRight: spacing.sm,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
});
