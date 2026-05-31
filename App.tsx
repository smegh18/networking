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
  const [isReady, setIsReady] = useState(false);
  const [isMinSplashDone, setIsMinSplashDone] = useState(false);
  const [devMode, setDevMode] = useState(false);

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
        <TouchableOpacity 
          style={styles.devBypass} 
          onPress={() => setDevMode(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.devBypassText}>Enter Dev Mode (Bypass Loading)</Text>
        </TouchableOpacity>
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
  devBypass: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  devBypassText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
