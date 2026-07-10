import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { MoreStackParamList, Business } from '../../types';

type Props = StackScreenProps<MoreStackParamList, 'More'>;

interface MoreCardItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badgeCount?: number;
}

export const MoreScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { items: businessEntries } = useRealtimeCollection<Business>('business');

  const handleBusiness = () => {
    // MoreScreen is inside MoreTab (stack) -> MainTabs (bottom tabs).
    // Navigate via the tab parent so it works reliably on mobile.
    const tabNav = navigation.getParent();
    if (tabNav) {
      (tabNav as any).navigate('DashboardTab', { screen: 'BusinessGiven' });
      return;
    }

    // Fallback for unexpected navigator nesting.
    navigation.dispatch(
      CommonActions.navigate({
        name: 'MainTabs',
        params: {
          screen: 'DashboardTab',
          params: { screen: 'BusinessGiven' },
        },
      } as never),
    );
  };

  const handleInviteVisitor = () => {
    navigation.navigate('InviteVisitor');
  };

  const handleEvents = () => {
    navigation.navigate('Events');
  };

  const handleReferrals = () => {
    navigation.navigate('ReferralStatus');
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleAbout = () => {
    Alert.alert(
      t('settings.about'),
      t('settings.aboutApp', 'About this app'),
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      t('settings.privacyPolicy'),
      t('settings.privacyPolicy', 'Privacy policy content'),
    );
  };

  const handleTerms = () => {
    Alert.alert(
      t('settings.termsOfService'),
      t('settings.termsOfService', 'Terms of service content'),
    );
  };

  const handleHelp = () => {
    Alert.alert(
      t('settings.helpSupport'),
      t('settings.helpSupport', 'Help & support'),
    );
  };

  const businessCount = currentUser?.uid
    ? businessEntries.filter((entry) => entry.givenById === currentUser.uid || entry.givenToId === currentUser.uid).length
    : 0;

  const cards: MoreCardItem[] = [
    { key: 'invite', icon: 'person-add-outline', label: t('inviteVisitor.title', 'Invite Visitor'), onPress: handleInviteVisitor },
    { key: 'business', icon: 'cash-outline', label: t('business.title', 'Business'), onPress: handleBusiness, badgeCount: businessCount },
    { key: 'events', icon: 'calendar-outline', label: t('events.title'), onPress: handleEvents },
    { key: 'referrals', icon: 'git-network-outline', label: t('referrals.title'), onPress: handleReferrals },
    { key: 'notifications', icon: 'notifications-outline', label: t('notifications.title'), onPress: handleNotifications },
    { key: 'settings', icon: 'settings-outline', label: t('settings.title'), onPress: handleSettings },
    { key: 'about', icon: 'information-circle-outline', label: t('settings.about'), onPress: handleAbout },
    { key: 'privacy', icon: 'shield-checkmark-outline', label: t('settings.privacyPolicy'), onPress: handlePrivacy },
    { key: 'terms', icon: 'document-text-outline', label: t('settings.termsOfService'), onPress: handleTerms },
    { key: 'help', icon: 'help-circle-outline', label: t('settings.helpSupport'), onPress: handleHelp },
  ];

  return (
    <ScreenWrapper uniformLayout>
      <View style={styles.header}>
        <Text style={styles.title}>{t('more.title', 'More')}</Text>
        <Text style={styles.subtitle}>{t('more.subtitle', 'Quick access to all features')}</Text>
      </View>

      <View style={styles.cardGrid}>
        {cards.map((item) => (
          <Card
            key={item.key}
            onPress={item.onPress}
            style={styles.card}
            padded={true}
          >
            <View style={styles.cardInner}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardLabel}>{item.label}</Text>
                {item.badgeCount ? <Badge count={item.badgeCount} size="sm" style={styles.cardBadge} /> : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </View>
          </Card>
        ))}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardGrid: {
    gap: spacing.md,
  },
  card: {
    marginBottom: 0,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  cardTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLabel: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  cardBadge: {
    marginLeft: spacing.sm,
  },
});
