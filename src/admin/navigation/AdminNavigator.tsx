import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { AdminStackParamList } from '../types/admin';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminRolesScreen from '../screens/AdminRolesScreen';
import AdminUserFormScreen from '../screens/AdminUserFormScreen';
import AdminChaptersScreen from '../screens/AdminChaptersScreen';
import AdminEventsScreen from '../screens/AdminEventsScreen';
import AdminEventAttendanceListScreen from '../screens/AdminEventAttendanceListScreen';
import AdminEventFormScreen from '../screens/AdminEventFormScreen';
import AdminEventAttendanceScreen from '../screens/AdminEventAttendanceScreen';
import AdminReferralsScreen from '../screens/AdminReferralsScreen';
import AdminAdsScreen from '../screens/AdminAdsScreen';
import AdminAdFormScreen from '../screens/AdminAdFormScreen';
import AdminAsksScreen from '../screens/AdminAsksScreen';
import AdminNotificationsScreen from '../screens/AdminNotificationsScreen';
import AdminBusinessConfigScreen from '../screens/AdminBusinessConfigScreen';

const Stack = createStackNavigator<AdminStackParamList>();

export const AdminNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
    <Stack.Screen name="AdminRoles" component={AdminRolesScreen} />
    <Stack.Screen name="AdminUserForm" component={AdminUserFormScreen} />
    <Stack.Screen name="AdminChapters" component={AdminChaptersScreen} />
    <Stack.Screen name="AdminEvents" component={AdminEventsScreen} />
    <Stack.Screen name="AdminEventAttendanceList" component={AdminEventAttendanceListScreen} />
    <Stack.Screen name="AdminEventForm" component={AdminEventFormScreen} />
    <Stack.Screen name="AdminEventAttendance" component={AdminEventAttendanceScreen} />
    <Stack.Screen name="AdminReferrals" component={AdminReferralsScreen} />
    <Stack.Screen name="AdminAds" component={AdminAdsScreen} />
    <Stack.Screen name="AdminAdForm" component={AdminAdFormScreen} />
    <Stack.Screen name="AdminAsks" component={AdminAsksScreen} />
    <Stack.Screen name="AdminBusinessConfig" component={AdminBusinessConfigScreen} />
    <Stack.Screen name="AdminNotifications" component={AdminNotificationsScreen} />
  </Stack.Navigator>
);
