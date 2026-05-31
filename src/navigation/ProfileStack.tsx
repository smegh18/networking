import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ProfileStackParamList } from '../types';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import BusinessPhotosScreen from '../screens/profile/BusinessPhotosScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import LanguageSettingsScreen from '../screens/profile/LanguageSettingsScreen';

const Stack = createStackNavigator<ProfileStackParamList>();

export const ProfileStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="BusinessPhotos" component={BusinessPhotosScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
    </Stack.Navigator>
  );
};
