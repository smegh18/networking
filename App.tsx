import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { I18nextProvider } from 'react-i18next';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import i18n from './src/i18n';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme';
import { AppSplash } from './src/components/layout/AppSplash';
import { useAuthInit } from './src/hooks/useAuthInit';
import { useAuthStore } from './src/stores/authStore';

const LoadingScreen = () => <AppSplash name="Brahmin Connect" />;

export default function App() {
  useAuthInit();
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const authLoading = useAuthStore((s) => s.isLoading);
  const [isReady, setIsReady] = useState(false);
  const [isMinSplashDone, setIsMinSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMinSplashDone(true), isWeb ? 2500 : 3000);
    return () => clearTimeout(timer);
  }, [isWeb]);

  useEffect(() => {
    const init = async () => {
      try {
        // Load icon fonts for web using their deployed URLs
        if (isWeb) {
          await Font.loadAsync({
            'Ionicons': '/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf',
            'MaterialIcons': '/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf',
            'MaterialCommunityIcons': '/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.6e435534bd35da5fef04168860a9b8fa.ttf',
          });
        } else {
          // Load icon fonts correctly for all platforms
          await Font.loadAsync({
            ...Ionicons.font,
            ...MaterialIcons.font,
            ...MaterialCommunityIcons.font,
          });
        }

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

  if (!isReady || authLoading || !isMinSplashDone || !isLayoutStable) {
    return <LoadingScreen />;
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
});
