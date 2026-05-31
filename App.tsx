import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { I18nextProvider } from 'react-i18next';
import { View, StyleSheet, Platform, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import i18n from './src/i18n';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import { AppSplash } from './src/components/layout/AppSplash';
import { useAuthInit } from './src/hooks/useAuthInit';
import { useAuthStore } from './src/stores/authStore';

export default function App() {
  useAuthInit();
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const authLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const [isReady, setIsReady] = useState(false);
  const [isMinSplashDone, setIsMinSplashDone] = useState(false);
  const [devMode, setDevMode] = useState(false);

  const handleDevLogin = (role: 'member' | 'admin') => {
    const mockUser = {
      uid: `dev-${role}-${Date.now()}`,
      email: `${role}@test.com`,
      name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      firstName: 'Test',
      lastName: role.charAt(0).toUpperCase() + role.slice(1),
      phone: '9876543210',
      photoURL: '',
      businessName: 'Test Business',
      businessDescription: 'This is a test account for development.',
      businessCategory: 'Technology',
      businessTags: ['Testing', 'Dev'],
      businessPhotos: [],
      chapterId: 'dev-chapter',
      zoneId: 'dev-zone',
      location: { city: 'Dev City', state: 'Dev State' },
      dateOfBirth: '1990-01-01',
      language: 'en' as const,
      biometricEnabled: false,
      role: role as any,
      profileComplete: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      socialLinks: { instagram: '', facebook: '', whatsapp: '', linkedin: '' }
    };
    setUser(mockUser as any);
    setDevMode(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsMinSplashDone(true), isWeb ? 2500 : 3000);
    return () => clearTimeout(timer);
  }, [isWeb]);

  useEffect(() => {
    const init = async () => {
      try {
        // Load icon fonts correctly for all platforms
        await Font.loadAsync({
          ...Ionicons.font,
          ...MaterialIcons.font,
          ...MaterialCommunityIcons.font,
        });

        // Wait for i18n to be initialized (async language detection)
        if (!i18n.isInitialized) {
          await new Promise<void>((resolve) => {
            i18n.on('initialized', () => resolve());
          });
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, [isWeb]);

  useEffect(() => {
    if (!isWeb) return;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const prev = {
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      rootHeight: root?.style.height ?? '',
      rootOverflow: root?.style.overflow ?? '',
    };

    html.style.height = '100%';
    html.style.overflow = 'hidden';
    body.style.height = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    if (root) {
      root.style.height = '100%';
      root.style.overflow = 'auto';
      root.style.overscrollBehavior = 'none';
      root.style.scrollbarGutter = 'stable';
    }

    return () => {
      html.style.height = prev.htmlHeight;
      html.style.overflow = prev.htmlOverflow;
      body.style.height = prev.bodyHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      if (root) {
        root.style.height = prev.rootHeight;
        root.style.overflow = prev.rootOverflow;
        (root.style as any).overscrollBehavior = '';
        (root.style as any).scrollbarGutter = '';
      }
    };
  }, [isWeb]);

  // On Web, wait for width to be measured (> 0) to prevent layout flickering
  const [isLayoutStable, setIsLayoutStable] = useState(!isWeb);

  useEffect(() => {
    if (isWeb && width > 0) {
      // Increase buffer to ensure browser layout engine has fully settled
      const timer = setTimeout(() => setIsLayoutStable(true), 400);
      return () => clearTimeout(timer);
    }
  }, [isWeb, width]);

  if (!devMode && (!isReady || authLoading || !isMinSplashDone || !isLayoutStable)) {
    return (
      <View style={styles.root}>
        <AppSplash name="Brahmin Connect" />
        <View style={styles.devMenu}>
          <Text style={styles.devMenuTitle}>Developer Menu</Text>
          <View style={styles.devButtons}>
            <TouchableOpacity 
              style={styles.devButton} 
              onPress={() => handleDevLogin('member')}
            >
              <Text style={styles.devButtonText}>Login as Member</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.devButton} 
              onPress={() => handleDevLogin('admin')}
            >
              <Text style={styles.devButtonText}>Login as Admin</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.devButton, styles.devButtonOutline]} 
              onPress={() => setDevMode(true)}
            >
              <Text style={styles.devButtonTextSecondary}>Just Skip Loading</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const content = (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <PaperProvider>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <AppNavigator />
        </PaperProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );

  return (
    isWeb ? (
      <View style={styles.root}>
        {content}
      </View>
    ) : (
      <GestureHandlerRootView style={styles.root}>
        {content}
      </GestureHandlerRootView>
    )
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  devMenu: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  devMenuTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  devButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  devButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  devButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  devButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  devButtonTextSecondary: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
});
