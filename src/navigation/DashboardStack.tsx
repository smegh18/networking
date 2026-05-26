import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardStackParamList } from '../types';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import SearchResultsScreen from '../screens/dashboard/SearchResultsScreen';
import EventsScreen from '../screens/dashboard/EventsScreen';
import EventDetailScreen from '../screens/dashboard/EventDetailScreen';
import EventAttendanceScannerScreen from '../screens/dashboard/EventAttendanceScannerScreen';
import ScheduleMeetingScreen from '../screens/dashboard/ScheduleMeetingScreen';
import ReferralStatusScreen from '../screens/dashboard/ReferralStatusScreen';
import AskDetailScreen from '../screens/dashboard/AskDetailScreen';
import InteractionsScreen from '../screens/dashboard/InteractionsScreen';
import InviteVisitorScreen from '../screens/dashboard/InviteVisitorScreen';
import BusinessGivenScreen from '../screens/dashboard/BusinessGivenScreen';
import AddBusinessScreen from '../screens/dashboard/AddBusinessScreen';

const Stack = createStackNavigator<DashboardStackParamList>();

export const DashboardStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventAttendanceScanner" component={EventAttendanceScannerScreen} />
      <Stack.Screen name="ScheduleMeeting" component={ScheduleMeetingScreen} />
      <Stack.Screen name="ReferralStatus" component={ReferralStatusScreen} />
      <Stack.Screen name="AskDetail" component={AskDetailScreen} />
      <Stack.Screen name="Interactions" component={InteractionsScreen} />
      <Stack.Screen name="InviteVisitor" component={InviteVisitorScreen} />
      <Stack.Screen name="BusinessGiven" component={BusinessGivenScreen} />
      <Stack.Screen name="AddBusiness" component={AddBusinessScreen} />
    </Stack.Navigator>
  );
};
