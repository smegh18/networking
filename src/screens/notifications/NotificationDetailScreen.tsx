import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { NotificationsStackParamList, AppNotification } from '../../types';

type Props = StackScreenProps<NotificationsStackParamList, 'NotificationDetail'>;

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; actionLabel: string }> = {
  birthday: { icon: 'gift-outline', color: '#EC4899', actionLabel: 'notifications.sendWish' },
  event: { icon: 'calendar-outline', color: '#8B5CF6', actionLabel: 'notifications.viewEvent' },
  meeting: { icon: 'people-outline', color: '#3B82F6', actionLabel: 'notifications.viewMeeting' },
  referral: { icon: 'git-network-outline', color: '#10B981', actionLabel: 'notifications.viewReferral' },
  system: { icon: 'notifications-outline', color: '#F59E0B', actionLabel: 'common.back' },
};

const NotificationDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { notificationId } = route.params;
  const { items: notifications } = useRealtimeCollection<AppNotification>('notifications');
  const notification = useMemo(
    () => notifications.find((item) => item.id === notificationId) ?? null,
    [notificationId, notifications],
  );

  if (!notification) {
    return (
      <ScreenWrapper>
        <Header title={t('notifications.detail')} onBack={() => navigation.goBack()} />
        <EmptyState
          icon="notifications-outline"
          title={t('notifications.noNotifications')}
          message={t('notifications.noNotificationsMessage')}
        />
      </ScreenWrapper>
    );
  }

  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
  const formattedDate = new Date(notification.createdAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ScreenWrapper>
      <Header title={t('notifications.detail')} onBack={() => navigation.goBack()} />

      <View style={styles.iconSection}>
        <View style={[styles.iconCircle, { backgroundColor: `${config.color}15` }]}>
          <Ionicons name={config.icon} size={32} color={config.color} />
        </View>
        <View style={[styles.typeBadge, { backgroundColor: `${config.color}20` }]}>
          <Text style={[styles.typeText, { color: config.color }]}>
            {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{notification.title}</Text>
      <Text style={styles.date}>{formattedDate}</Text>

      <Card style={styles.bodyCard}>
        <Text style={styles.body}>{notification.body}</Text>
      </Card>

      <Button
        title={t(config.actionLabel)}
        onPress={() => navigation.goBack()}
        fullWidth
        icon="arrow-forward-outline"
        iconPosition="right"
        style={styles.actionButton}
      />
    </ScreenWrapper>
  );
};

export default NotificationDetailScreen;

const styles = StyleSheet.create({
  iconSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  typeBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  typeText: {
    ...typography.captionMedium,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  date: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  bodyCard: {
    marginBottom: spacing['3xl'],
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  actionButton: {
    marginBottom: spacing['3xl'],
  },
});
