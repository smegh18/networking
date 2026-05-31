import React, { useState } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '../types';
import { AuthStack } from './AuthStack';
import { MainDrawer } from './MainDrawer';
import { AdminNavigator } from '../admin/navigation/AdminNavigator';
import { EventInvitationPopup } from '../components/events/EventInvitationPopup';
import { ApprovalPendingModal } from '../components/auth/ApprovalPendingModal';
import { useAuthStore } from '../stores/authStore';
import { usePendingRegistrationCleanup } from '../hooks/usePendingRegistrationCleanup';
import { useCurrentUserRealtime } from '../hooks/useRealtimeData';
import { signOut } from '../services/firebase/auth';

const Stack = createStackNavigator<RootStackParamList>();
const navRef = createNavigationContainerRef<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F8FAFC',
  },
};

const linking = {
  prefixes: [
    Linking.createURL('/'),
    'netconnect://',
    'bbcn://',
    'https://bbcn-networking.web.app',
    'https://bbcn-networking.firebaseapp.com',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          MainTabs: {
            screens: {
              DashboardTab: {
                screens: {
                  Dashboard: '',
                  Events: 'events',
                  EventDetail: 'event/:eventId',
                  InviteVisitor: 'invite',
                },
              },
            },
          },
        },
      },
    },
  },
};

const AuthStackWrapper = () => {
  const user = useAuthStore((s) => s.user);
  const needsProfileCompletion = !!user && user.profileComplete === false;
  return <AuthStack initialRouteName={needsProfileCompletion ? 'Register' : 'Welcome'} />;
};

const DEV_AUTH_ENABLED = __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_AUTH === 'true';

const DevModeSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const createMockUser = (role: 'member' | 'admin') => {
    const now = new Date().toISOString();
    setUser({
      uid: `dev-${role}`,
      email: role === 'admin' ? 'dev-admin@local.test' : 'dev-member@local.test',
      name: role === 'admin' ? 'Dev Admin' : 'Dev Member',
      phone: '',
      photoURL: '',
      businessName: role === 'admin' ? 'Dev Admin Console' : 'Dev Member Business',
      businessDescription: '',
      businessCategory: '',
      businessTags: [],
      businessPhotos: [],
      socialLinks: { instagram: '', facebook: '', whatsapp: '', linkedin: '' },
      chapterId: '',
      location: { city: '', state: '' },
      dateOfBirth: '',
      language: 'en',
      biometricEnabled: false,
      role,
      leadershipRole: 'member',
      leadershipRolePoints: 0,
      leadershipRoleCity: '',
      isActive: true,
      profileComplete: true,
      createdAt: now,
      updatedAt: now,
    });
    setOpen(false);
  };

  const goto = (route: keyof RootStackParamList) => {
    if (!navRef.isReady()) return;
    navRef.navigate(route);
    setOpen(false);
  };

  return (
    <View pointerEvents="box-none" style={devStyles.wrap}>
      {open ? (
        <View style={devStyles.panel}>
          <Text style={devStyles.title}>Dev Mode</Text>
          <Text style={devStyles.subTitle}>Only active when EXPO_PUBLIC_ENABLE_DEV_AUTH=true</Text>
          <Pressable style={devStyles.item} onPress={() => createMockUser('member')}>
            <Text style={devStyles.itemText}>Mock Member Session</Text>
          </Pressable>
          <Pressable style={devStyles.item} onPress={() => createMockUser('admin')}>
            <Text style={devStyles.itemText}>Mock Admin Session</Text>
          </Pressable>
          <Pressable style={devStyles.item} onPress={() => goto('Auth')}>
            <Text style={devStyles.itemText}>Go Auth Stack</Text>
          </Pressable>
          <Pressable style={devStyles.item} onPress={() => goto('Main')}>
            <Text style={devStyles.itemText}>Go Main Stack</Text>
          </Pressable>
          <Pressable style={devStyles.item} onPress={() => goto('Admin')}>
            <Text style={devStyles.itemText}>Go Admin Stack</Text>
          </Pressable>
          <Pressable
            style={[devStyles.item, isAuthenticated ? devStyles.warnItem : null]}
            onPress={() => {
              clearAuth();
              setOpen(false);
            }}
          >
            <Text style={devStyles.itemText}>Clear Session</Text>
          </Pressable>
        </View>
      ) : null}
      <Pressable style={devStyles.fab} onPress={() => setOpen((prev) => !prev)}>
        <Text style={devStyles.fabText}>{open ? 'x' : 'DEV'}</Text>
      </Pressable>
    </View>
  );
};

export const AppNavigator: React.FC = () => {
  usePendingRegistrationCleanup();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isApproved = user?.isActive !== false;
  useCurrentUserRealtime();

  return (
    <NavigationContainer ref={navRef} linking={linking} theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          isAdmin ? (
            <Stack.Screen name="Admin" component={AdminNavigator} />
          ) : (
            <Stack.Screen name="Main" component={MainDrawer} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthStackWrapper} />
        )}
      </Stack.Navigator>
      {isAuthenticated && user && !isAdmin && isApproved ? <EventInvitationPopup /> : null}
      <ApprovalPendingModal
        visible={!!(isAuthenticated && user && !isAdmin && user.profileComplete !== false && user.isActive === false)}
        onLogout={async () => {
          try {
            await signOut();
          } finally {
            clearAuth();
          }
        }}
      />
      {DEV_AUTH_ENABLED && Platform.OS === 'web' ? <DevModeSwitcher /> : null}
    </NavigationContainer>
  );
};

const devStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  panel: {
    width: 260,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    padding: 10,
    marginBottom: 8,
  },
  title: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  subTitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 8,
  },
  item: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
  },
  itemText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  warnItem: {
    backgroundColor: '#7F1D1D',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
