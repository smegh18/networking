import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
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
} as const;

export const AppNavigator: React.FC = () => {
  usePendingRegistrationCleanup();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const needsProfileCompletion = !!user && user.profileComplete === false;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isApproved = user?.isActive !== false;
  useCurrentUserRealtime();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          isAdmin ? (
            <Stack.Screen name="Admin" component={AdminNavigator} />
          ) : (
            <Stack.Screen name="Main" component={MainDrawer} />
          )
        ) : (
          <Stack.Screen name="Auth">
            {() => <AuthStack initialRouteName={needsProfileCompletion ? 'Register' : 'Welcome'} />}
          </Stack.Screen>
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
    </NavigationContainer>
  );
};
