import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import EventsScreen from '../screens/dashboard/EventsScreen';
import EventDetailScreen from '../screens/dashboard/EventDetailScreen';

type EventsStackParamList = {
  Events: undefined;
  EventDetail: { eventId: string };
};

const Stack = createStackNavigator<EventsStackParamList>();

export const EventsStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    </Stack.Navigator>
  );
};
