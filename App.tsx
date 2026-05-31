import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { I18nextProvider } from 'react-i18next';
import { View, StyleSheet, Platform } from 'react-native';
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
  const authLoading = useAuthStore((s) => s.isLoading);
  const [isReady, setIsReady] = useState(false);
  const [isMinSplashDone, setIsMinSplashDone] = useState(isWeb);

  useEffect(() => {
    if (isWeb) return;
    const timer = setTimeout(() => setIsMinSplashDone(true), 3000);
    return () => clearTimeout(timer);
  }, [isWeb]);

  useEffect(() => {
    const init = async () => {
      try {
        // Load icon fonts
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
        // Continue even if initialization has issues
        console.error('Font loading error:', error);
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
      // @ts-ignore - scrollbar-gutter is a web property
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
        // @ts-ignore
        root.style.scrollbarGutter = '';
      }
    };
  }, [isWeb]);

  if (!isReady) {
    return isWeb ? <View style={styles.root} /> : <LoadingScreen />;
  }

  if (!isWeb && (!isMinSplashDone || authLoading)) {
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
    backgroundColor: colors.background,
  },
});
