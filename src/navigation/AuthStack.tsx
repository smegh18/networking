import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '../types';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import PhoneLoginScreen from '../screens/auth/PhoneLoginScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import BiometricSetupScreen from '../screens/auth/BiometricSetupScreen';
import LanguageSelectScreen from '../screens/auth/LanguageSelectScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC<{ initialRouteName?: keyof AuthStackParamList }> = ({ initialRouteName }) => {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' }, // Match colors.background
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
    </Stack.Navigator>
  );
};
