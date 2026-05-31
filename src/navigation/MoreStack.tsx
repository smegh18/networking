import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MoreStackParamList } from '../types';
import { MoreScreen } from '../screens/more/MoreScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import NotificationDetailScreen from '../screens/notifications/NotificationDetailScreen';
import InviteVisitorScreen from '../screens/dashboard/InviteVisitorScreen';
import EventsScreen from '../screens/dashboard/EventsScreen';
import EventDetailScreen from '../screens/dashboard/EventDetailScreen';
import EventAttendanceScannerScreen from '../screens/dashboard/EventAttendanceScannerScreen';
import ReferralStatusScreen from '../screens/dashboard/ReferralStatusScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

const Stack = createStackNavigator<MoreStackParamList>();

export const MoreStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
      <Stack.Screen name="InviteVisitor" component={InviteVisitorScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventAttendanceScanner" component={EventAttendanceScannerScreen} />
      <Stack.Screen name="ReferralStatus" component={ReferralStatusScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};
