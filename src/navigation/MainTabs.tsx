import React, { useEffect } from 'react';
import { StyleSheet, Platform, View, useWindowDimensions, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MainTabParamList } from '../types';
import { DashboardStack } from './DashboardStack';
import { NetworkStack } from './NetworkStack';
import { ProfileStack } from './ProfileStack';
import { MoreStack } from './MoreStack';
import { colors, typography, spacing, breakpoints } from '../theme';
import { WebSidebar } from '../components/layout/WebSidebar';
import { useAuthStore } from '../stores/authStore';
import { signOut } from '../services/firebase/auth';
import { clearPendingRegistration } from '../services/onboarding/pendingRegistration';

const Tab = createBottomTabNavigator<MainTabParamList>();

const WEB_BREAKPOINT = breakpoints.lg;

/** Sidebar wrapper that reads active tab from React Navigation state */
const WebSidebarNav: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const displayName = user?.name?.trim()
    || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
    || user?.email?.split('@')[0]
    || 'Member';
  const displayBusiness = user?.businessName?.trim() || 'Business';

  // Read the tab navigator state (sidebar has no More tab; highlight by main tab only)
  const activeTab = useNavigationState((state) => {
    const drawerRoute = state?.routes?.[0];
    const tabState = drawerRoute?.state;
    if (tabState && tabState.index != null) {
      const currentTabRoute = tabState.routes[tabState.index];
      const currentTabName = currentTabRoute?.name ?? 'DashboardTab';
      if (currentTabName === 'DashboardTab') {
        const nestedState = currentTabRoute?.state;
        if (nestedState?.index != null) {
          const nestedRouteName = nestedState.routes?.[nestedState.index]?.name;
          if (nestedRouteName === 'InviteVisitor') return 'InviteVisitor';
          if (nestedRouteName === 'BusinessGiven') return 'BusinessGiven';
          if (nestedRouteName === 'Events') return 'Events';
          if (nestedRouteName === 'ReferralStatus') return 'ReferralStatus';
        }
      }
      return currentTabName;
    }
    return 'DashboardTab';
  });

  return (
    <WebSidebar
      activeTab={activeTab}
      onTabPress={(key) => {
        if (key === 'InviteVisitor') {
          navigation.navigate('MainTabs', { screen: 'DashboardTab', params: { screen: 'InviteVisitor' } });
          return;
        }
        if (key === 'BusinessGiven') {
          navigation.navigate('MainTabs', { screen: 'DashboardTab', params: { screen: 'BusinessGiven' } });
          return;
        }
        if (key === 'Events') {
          navigation.navigate('MainTabs', { screen: 'DashboardTab', params: { screen: 'Events' } });
          return;
        }
        if (key === 'ReferralStatus') {
          navigation.navigate('MainTabs', { screen: 'DashboardTab', params: { screen: 'ReferralStatus' } });
          return;
        }
        if (key === 'Notifications') {
          navigation.navigate('MainTabs', { screen: 'MoreTab', params: { screen: 'Notifications' } });
          return;
        }
        if (key === 'Settings') {
          navigation.navigate('MainTabs', { screen: 'ProfileTab', params: { screen: 'Settings' } });
          return;
        }
        if (key === 'DashboardTab') {
          navigation.navigate('MainTabs', { screen: 'DashboardTab', params: { screen: 'Dashboard' } });
          return;
        }
        if (key === 'ProfileTab') {
          navigation.navigate('MainTabs', { screen: 'ProfileTab', params: { screen: 'Profile' } });
          return;
        }
        navigation.navigate('MainTabs', { screen: key });
      }}
      userName={displayName}
      businessName={displayBusiness}
      onLogout={onLogout}
    />
  );
};

export const MainTabs: React.FC = () => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWebWide = Platform.OS === 'web' && width > WEB_BREAKPOINT;
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    // Reaching the main tabs implies the user made it to the dashboard.
    // Clear any "pending registration" marker so it won't be cleaned up on next launch.
    void clearPendingRegistration();
  }, []);

  const tabBarBottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? spacing.lg : spacing.md,
  );
  const tabBarVerticalPadding = Platform.OS === 'web' ? spacing.md : spacing.sm;
  const tabBarBaseHeight = Platform.select({
    ios: 58,
    android: 62,
    web: 72,
  }) ?? 58;

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        await signOut();
      } finally {
        clearAuth();
      }
    };
    if (Platform.OS === 'web') {
      await doLogout();
    } else {
      Alert.alert(
        t('auth.logout'),
        t('auth.logoutConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('auth.logout'), style: 'destructive', onPress: () => doLogout() },
        ]
      );
    }
  };

  return (
    <View style={[styles.root, isWebWide && styles.webRoot]}>
      {isWebWide && <WebSidebarNav onLogout={handleLogout} />}
      <View style={styles.tabContainer}>
        <Tab.Navigator
          safeAreaInsets={{ bottom: 0 }}
          screenOptions={({ route }) => ({
            headerShown: false,
            sceneContainerStyle: styles.scene,
            tabBarIcon: ({ focused, color }) => {
              let iconName: keyof typeof Ionicons.glyphMap;
              switch (route.name) {
                case 'DashboardTab':
                  iconName = focused ? 'grid' : 'grid-outline';
                  break;
                case 'NetworkTab':
                  iconName = focused ? 'people' : 'people-outline';
                  break;
                case 'ProfileTab':
                  iconName = focused ? 'person' : 'person-outline';
                  break;
                case 'MoreTab':
                  iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
                  break;
                default:
                  iconName = 'grid-outline';
              }
              return <View><Ionicons name={iconName} size={24} color={color} /></View>;
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: isWebWide
              ? styles.webHiddenTabBar
              : [
                styles.tabBar,
                {
                  height: tabBarBaseHeight + tabBarBottomInset,
                  paddingTop: tabBarVerticalPadding,
                  paddingBottom: tabBarBottomInset,
                },
              ],
            tabBarLabelStyle: styles.tabLabel,
            tabBarItemStyle: [styles.tabItem, { paddingVertical: tabBarVerticalPadding }],
          })}
        >
          <Tab.Screen
            name="DashboardTab"
            component={DashboardStack}
            options={{
              tabBarLabel: t('dashboard.title'),
              listeners: ({ navigation }) => ({
                tabPress: (e) => {
                  e.preventDefault();
                  navigation.navigate('DashboardTab', { screen: 'Dashboard' });
                },
              }),
            }}
          />
          <Tab.Screen name="NetworkTab" component={NetworkStack} options={{ tabBarLabel: t('network.title') }} />
          <Tab.Screen
            name="ProfileTab"
            component={ProfileStack}
            options={{
              tabBarLabel: t('profile.title'),
              listeners: ({ navigation }) => ({
                tabPress: (e) => {
                  e.preventDefault();
                  navigation.navigate('ProfileTab', { screen: 'Profile' });
                },
              }),
            }}
          />
          <Tab.Screen name="MoreTab" component={MoreStack} options={{ tabBarLabel: t('more.title', 'More') }} />
        </Tab.Navigator>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scene: {
    backgroundColor: colors.background,
  },
  tabContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webRoot: {
    flexDirection: 'row',
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  webHiddenTabBar: {
    display: 'none',
  },
  tabLabel: {
    ...typography.caption,
    fontWeight: '500',
    marginTop: spacing.xs,
    marginBottom: Platform.select({
      ios: 0,
      android: spacing.xs,
      web: spacing.xs,
    }),
    lineHeight: 16,
  },
  tabItem: {
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
});
