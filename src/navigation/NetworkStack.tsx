import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NetworkStackParamList } from '../types';
import NetworkScreen from '../screens/network/NetworkScreen';
import BusinessProfileScreen from '../screens/network/BusinessProfileScreen';
import FilterScreen from '../screens/network/FilterScreen';
import RequestScreen from '../screens/network/RequestScreen';

const Stack = createStackNavigator<NetworkStackParamList>();

export const NetworkStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="Network" component={NetworkScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
      <Stack.Screen name="Filter" component={FilterScreen} />
      <Stack.Screen name="Request" component={RequestScreen} />
    </Stack.Navigator>
  );
};
