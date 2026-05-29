import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NotificationsStackParamList } from '../types';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import NotificationDetailScreen from '../screens/notifications/NotificationDetailScreen';

const Stack = createStackNavigator<NotificationsStackParamList>();

export const NotificationsStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
    </Stack.Navigator>
  );
};
