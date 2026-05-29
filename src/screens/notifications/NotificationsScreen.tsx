import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Linking, Alert, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import { BirthdayCard } from '../../components/notifications/BirthdayCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { openWhatsApp } from '../../utils/helpers';
import type { NotificationsStackParamList, AppNotification, User } from '../../types';

type Props = StackScreenProps<NotificationsStackParamList, 'Notifications'>;

type TabFilter = 'all' | 'birthdays' | 'events' | 'meetings';

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { items: allNotifications } = useRealtimeCollection<AppNotification>('notifications');
  const { items: users } = useRealtimeCollection<User>('users', 'uid');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const notifications = useMemo(
    () =>
      allNotifications
        .filter((item) => item.userId === currentUser?.uid)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [allNotifications, currentUser?.uid],
  );

  const birthdayUsers = useMemo(
    () =>
      users.filter((user) => {
        if (!user.dateOfBirth) return false;
        const dob = new Date(user.dateOfBirth);
        const now = new Date();
        return dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth();
      }),
    [users],
  );

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'birthdays') return n.type === 'birthday';
        if (activeTab === 'events') return n.type === 'event';
        if (activeTab === 'meetings') return n.type === 'meeting';
        return true;
      }),
    [activeTab, notifications],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (notificationId: string) => {
    try {
      await update(ref(rtdb, `notifications/${notificationId}`), { read: true });
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.read)
          .map((n) => update(ref(rtdb, `notifications/${n.id}`), { read: true })),
      );
    } catch {}
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    await markRead(notification.id);

    if (notification.type === 'meeting') {
      const tabNav = navigation.getParent();
      if (tabNav) {
        (tabNav as any).navigate('DashboardTab', { screen: 'Interactions' });
        return;
      }
    }

    if (notification.type === 'event' && notification.data?.eventId) {
      const tabNav = navigation.getParent();
      if (tabNav) {
        (tabNav as any).navigate('DashboardTab', {
          screen: 'EventDetail',
          params: { eventId: notification.data.eventId },
        });
        return;
      }
    }

    navigation.navigate('NotificationDetail', { notificationId: notification.id });
  };

  const findBirthdayUser = (notification: AppNotification): User | undefined => {
    const birthdayUserId = notification.data?.birthdayUserId;
    if (!birthdayUserId) return undefined;
    return users.find((u) => u.uid === birthdayUserId);
  };

  const handleSendBirthdayWish = async (user: User) => {
    const phone = user.socialLinks.whatsapp || user.phone;
    if (!phone) return;
    const cleanedPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Happy Birthday ${user.name}! Wishing you a fantastic year ahead.`);
    const whatsappUrl = `${openWhatsApp(cleanedPhone)}?text=${message}`;
    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert(t('common.error', 'Error'), t('notifications.whatsappOpenFailed', 'Unable to open WhatsApp'));
    }
  };

  const tabs: { key: TabFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: t('notifications.all'), icon: 'notifications-outline' },
    { key: 'birthdays', label: t('notifications.birthdays'), icon: 'gift-outline' },
    { key: 'events', label: t('notifications.events'), icon: 'calendar-outline' },
    { key: 'meetings', label: t('notifications.meetings'), icon: 'people-outline' },
  ];

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <Header title={t('notifications.title')} />

      <View style={styles.headerRow}>
        <Text style={styles.unreadLabel}>{unreadCount} {t('notifications.unread', 'Unread')}</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllReadButton} onPress={handleMarkAllRead}>
            <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
            <Text style={styles.markAllReadText}>{t('notifications.markAllRead', 'Mark all read')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={16} color={isActive ? colors.textInverse : colors.textSecondary} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {birthdayUsers.length > 0 && (activeTab === 'all' || activeTab === 'birthdays') ? (
        <View style={styles.birthdaySection}>
          <Text style={styles.birthdayTitle}>{t('notifications.todayBirthdays')}</Text>
          {birthdayUsers.map((user) => (
            <View key={user.uid} style={styles.birthdayCardContainer}>
              <BirthdayCard user={user} onSendWish={() => handleSendBirthdayWish(user)} />
            </View>
          ))}
        </View>
      ) : null}

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const birthdayUser = item.type === 'birthday' ? findBirthdayUser(item) : undefined;
          return (
            <NotificationItem
              notification={item}
              onPress={() => handleNotificationPress(item)}
              onBirthdayWishPress={birthdayUser ? () => handleSendBirthdayWish(birthdayUser) : undefined}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <EmptyState
            icon="notifications-off-outline"
            title={t('notifications.noNotifications')}
            message={t('notifications.noNotificationsMessage')}
          />
        )}
      />
    </ScreenWrapper>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  unreadLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  markAllReadText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  birthdaySection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  birthdayTitle: {
    ...typography.bodySemiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  birthdayCardContainer: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
});
