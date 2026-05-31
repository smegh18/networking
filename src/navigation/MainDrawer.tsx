import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MainTabs } from './MainTabs';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Avatar } from '../components/ui/Avatar';
import { useAuthStore } from '../stores/authStore';
import { signOut } from '../services/firebase/auth';

const Drawer = createDrawerNavigator();

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { t } = useTranslation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  const navigateToScreen = (tabName: string, screenName: string) => {
    props.navigation.closeDrawer();
    props.navigation.dispatch(
      CommonActions.navigate({
        name: 'MainTabs',
        params: {
          screen: tabName,
          params: { screen: screenName },
        },
      }),
    );
  };

  const menuItems = [
    { icon: 'person-add-outline' as const, label: t('inviteVisitor.title', 'Invite Visitor'), onPress: () => navigateToScreen('DashboardTab', 'InviteVisitor') },
    { icon: 'cash-outline' as const, label: t('business.title', 'Business'), onPress: () => navigateToScreen('DashboardTab', 'BusinessGiven') },
    { icon: 'calendar-outline' as const, label: t('events.title'), onPress: () => navigateToScreen('DashboardTab', 'Events') },
    { icon: 'git-network-outline' as const, label: t('referrals.title'), onPress: () => navigateToScreen('DashboardTab', 'ReferralStatus') },
    { icon: 'settings-outline' as const, label: t('settings.title'), onPress: () => navigateToScreen('ProfileTab', 'Settings') },
    { icon: 'information-circle-outline' as const, label: t('settings.about'), onPress: () => props.navigation.closeDrawer() },
    { icon: 'shield-checkmark-outline' as const, label: t('settings.privacyPolicy'), onPress: () => props.navigation.closeDrawer() },
    { icon: 'document-text-outline' as const, label: t('settings.termsOfService'), onPress: () => props.navigation.closeDrawer() },
    { icon: 'help-circle-outline' as const, label: t('settings.helpSupport'), onPress: () => props.navigation.closeDrawer() },
  ];

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } finally {
              clearAuth();
            }
          },
        },
      ]
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.profileSection}>
        <Avatar uri={user?.photoURL} name={user?.name || user?.email || 'User'} size="lg" />
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userBusiness}>{user?.businessName || user?.email || ''}</Text>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon} size={22} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
        <Text style={styles.version}>{t('settings.version')}: 1.0.0</Text>
      </View>
    </DrawerContentScrollView>
  );
};

export const MainDrawer: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: styles.drawer,
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawer: {
    width: 300,
    backgroundColor: colors.surface,
  },
  drawerContent: {
    flex: 1,
  },
  profileSection: {
    padding: spacing['2xl'],
    paddingTop: spacing['3xl'],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: 'center',
  },
  userName: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
  },
  userBusiness: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  menuSection: {
    paddingVertical: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  menuLabel: {
    ...typography.body,
    color: colors.text,
  },
  footer: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: spacing['2xl'],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  logoutText: {
    ...typography.bodySemiBold,
    color: colors.error,
  },
  version: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
