import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StatusBar, Platform, RefreshControl, useWindowDimensions, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout, breakpoints } from '../../theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padded?: boolean;
  /** When true, use same padding and scroll layout as native (no web-specific widening). Use for Profile so content/sections match web and Android. */
  uniformLayout?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scrollable = true,
  padded = true,
  uniformLayout = false,
  style,
  contentStyle,
  refreshing = false,
  onRefresh,
  /** Bottom inset is handled by the tab bar on main app screens; use ['top', 'bottom'] on full-screen auth flows. */
  edges = ['top'],
}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isWideWeb = isWeb && width > breakpoints.lg;
  const useWebLayout = isWideWeb && !uniformLayout;

  const content = (
    <View style={[
      scrollable ? styles.scrollInner : styles.inner,
      padded && (useWebLayout ? styles.webPadded : styles.padded),
      contentStyle,
    ]}>
      {children}
    </View>
  );

  if (isWeb) {
    return (
      <View style={[styles.webContainer, style]}>
        {scrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, useWebLayout && styles.webScrollContent]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          <View style={styles.nonScrollOuter}>
            {content}
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.keyboardSafe}
        enabled={Platform.OS === 'ios'}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {scrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              ) : undefined
            }
          >
            {content}
          </ScrollView>
        ) : (
          <View style={styles.nonScrollOuter}>
            {content}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardSafe: {
    flex: 1,
    minHeight: 0,
  },
  webContainer: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: Platform.OS === 'web' ? 1 : undefined,
    paddingBottom: Platform.OS === 'web' ? spacing['4xl'] : spacing['3xl'] + 88,
    maxWidth: '100%',
  },
  webScrollContent: {
    paddingBottom: spacing['5xl'],
  },
  nonScrollOuter: {
    flex: 1,
    minHeight: 0,
    paddingBottom: Platform.OS === 'web' ? 0 : 88,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  scrollInner: {
    width: '100%',
    maxWidth: '100%',
  },
  padded: {
    paddingHorizontal: layout.screenPadding,
  },
  webPadded: {
    paddingHorizontal: layout.webPadding,
  },
});
