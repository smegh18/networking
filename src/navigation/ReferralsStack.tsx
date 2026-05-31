import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ReferralStatusScreen from '../screens/dashboard/ReferralStatusScreen';

type ReferralsStackParamList = {
  ReferralStatus: undefined;
};

const Stack = createStackNavigator<ReferralsStackParamList>();

export const ReferralsStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="ReferralStatus" component={ReferralStatusScreen} />
    </Stack.Navigator>
  );
};
