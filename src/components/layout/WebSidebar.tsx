import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Avatar } from '../ui/Avatar';

interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface WebSidebarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  userName: string;
  businessName: string;
  photoURL?: string;
  onLogout: () => void;
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  activeTab,
  onTabPress,
  userName,
  businessName,
  photoURL,
  onLogout,
}) => {
  const { t } = useTranslation();

  if (Platform.OS !== 'web') return null;

  const navItems: NavItem[] = [
    { key: 'DashboardTab', label: t('dashboard.title'), icon: 'grid-outline', iconActive: 'grid', },
    { key: 'NetworkTab', label: t('network.title'), icon: 'people-outline', iconActive: 'people', },
    { key: 'ProfileTab', label: t('profile.title'), icon: 'person-outline', iconActive: 'person', },
  ];

  const secondaryItems: NavItem[] = [
    { key: 'InviteVisitor', label: t('inviteVisitor.title', 'Invite Visitor'), icon: 'person-add-outline', iconActive: 'person-add' },
    { key: 'BusinessGiven', label: t('business.title', 'Business'), icon: 'cash-outline', iconActive: 'cash' },
    { key: 'Events', label: t('events.title'), icon: 'calendar-outline', iconActive: 'calendar' },
    { key: 'ReferralStatus', label: t('referrals.title'), icon: 'git-network-outline', iconActive: 'git-network' },
    { key: 'Notifications', label: t('notifications.title'), icon: 'notifications-outline', iconActive: 'notifications' },
    { key: 'Settings', label: t('settings.title'), icon: 'settings-outline', iconActive: 'settings' },
  ];

  return (
    <View style={styles.sidebar}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>{t('common.appName')}</Text>
        </View>

        {/* User Mini Profile */}
        <TouchableOpacity
          style={[styles.userCard, activeTab === 'ProfileTab' && styles.userCardActive]}
          onPress={() => onTabPress('ProfileTab')}
          activeOpacity={0.7}
        >
          <Avatar name={userName} uri={photoURL} size="sm" />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            <Text style={styles.userBusiness} numberOfLines={1}>{businessName}</Text>
          </View>
        </TouchableOpacity>

        {/* Main Navigation */}
        <View style={styles.navSection}>
          <Text style={styles.navSectionLabel}>MAIN MENU</Text>
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => onTabPress(item.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? item.iconActive : item.icon}
                  size={22}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {item.badge && item.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Secondary Navigation */}
        <View style={styles.navSection}>
          <Text style={styles.navSectionLabel}>OTHER</Text>
          {secondaryItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, isActive && styles.navItemActive]}
                activeOpacity={0.7}
                onPress={() => onTabPress(item.key)}
              >
                <Ionicons
                  name={isActive ? item.iconActive : item.icon}
                  size={22}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    ...(Platform.OS === 'web' ? { height: '100vh' as any, position: 'sticky' as any, top: 0 } : {}),
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: '100%',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  brandName: {
    ...typography.h3,
    color: colors.primary,
    marginLeft: spacing.md,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceVariant,
  },
  userCardActive: {
    backgroundColor: colors.primaryFaded,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  userName: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  userBusiness: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  navSection: {
    marginBottom: spacing.lg,
  },
  navSectionLabel: {
    ...typography.overline,
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: colors.primaryFaded,
  },
  navLabel: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    flex: 1,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 11,
  },
  spacer: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.lg,
  },
  logoutText: {
    ...typography.bodySmallMedium,
    color: colors.error,
    marginLeft: spacing.md,
  },
});
