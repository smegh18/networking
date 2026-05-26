import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, borderRadius } from '../../../theme';

interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { key: 'AdminDashboard', label: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { key: 'AdminUsers', label: 'Users', icon: 'people-outline', iconActive: 'people' },
      { key: 'AdminRoles', label: 'Role Management', icon: 'ribbon-outline', iconActive: 'ribbon' },
      { key: 'AdminChapters', label: 'Chapters & Zones', icon: 'business-outline', iconActive: 'business' },
      { key: 'AdminEvents', label: 'Events', icon: 'calendar-outline', iconActive: 'calendar' },
      { key: 'AdminEventAttendanceList', label: 'Event Attendance', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
      { key: 'AdminReferrals', label: 'Referrals', icon: 'git-network-outline', iconActive: 'git-network' },
      { key: 'AdminAds', label: 'Ads / Banners', icon: 'megaphone-outline', iconActive: 'megaphone' },
      { key: 'AdminAsks', label: 'Ask Board', icon: 'help-circle-outline', iconActive: 'help-circle' },
      { key: 'AdminBusinessConfig', label: 'Business Config', icon: 'options-outline', iconActive: 'options' },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { key: 'AdminNotifications', label: 'Notifications', icon: 'notifications-outline', iconActive: 'notifications' },
    ],
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeScreen,
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.sidebar}>
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.logoContainer}>
          <Ionicons name="shield-checkmark" size={24} color={colors.textInverse} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.brandName}>{t('common.appName')}</Text>
          <Text style={styles.brandSub}>Admin Panel</Text>
        </View>
      </View>

      {/* Navigation */}
      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        {NAV_SECTIONS.map((section) => (
          <View key={section.title} style={styles.navSection}>
            <Text style={styles.navSectionLabel}>{section.title}</Text>
            {section.items.map((item) => {
              const isActive = activeScreen === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => onNavigate(item.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isActive ? item.iconActive : item.icon}
                    size={20}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 256,
    height: '100%',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minHeight: 0,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    marginLeft: spacing.md,
  },
  brandName: {
    ...typography.h4,
    color: colors.primary,
    fontWeight: '700',
  },
  brandSub: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  navScroll: {
    flex: 1,
    minHeight: 0,
    paddingTop: spacing.md,
  },
  navSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  navSectionLabel: {
    ...typography.overline,
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 11,
    letterSpacing: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
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
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  logoutText: {
    ...typography.bodySmallMedium,
    color: colors.error,
    marginLeft: spacing.md,
  },
});
