import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Pressable, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { useAuthStore } from '../../../stores/authStore';
import { signOut } from '../../../services/firebase/auth';
import { colors } from '../../../theme';
import { ADMIN_LAYOUT } from '../../constants/layout';

const COMPACT_LAYOUT_MAX_WIDTH = 1024;
const SIDEBAR_WIDTH = 256;

interface AdminLayoutProps {
  title: string;
  activeScreen: string;
  showBackButton?: boolean;
  onBack?: () => void;
  scrollable?: boolean;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  title,
  activeScreen,
  showBackButton,
  onBack,
  scrollable = true,
  children,
}) => {
  const navigation = useNavigation<any>();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { width } = useWindowDimensions();
  const isCompact = width < COMPACT_LAYOUT_MAX_WIDTH;
  const [sidebarOpen, setSidebarOpen] = useState(!isCompact);

  useEffect(() => {
    setSidebarOpen(!isCompact);
  }, [isCompact]);

  const handleNavigate = (screen: string) => {
    if (isCompact) {
      setSidebarOpen(false);
    }
    navigation.navigate(screen);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      setSidebarOpen(false);
      clearAuth();
    }
  };

  const content = useMemo(() => {
    const innerContent = (
      <View style={styles.contentWrapper}>
        <View style={styles.contentInner}>
          {children}
        </View>
      </View>
    );

    if (!scrollable) {
      return <View style={styles.nonScrollableContent}>{innerContent}</View>;
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
        // @ts-ignore
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        bounces={false}
        overScrollMode="never"
      >
        {innerContent}
      </ScrollView>
    );
  }, [children, scrollable]);

  const showInlineSidebar = !isCompact;
  const showOverlaySidebar = isCompact && sidebarOpen;
  const showSidebar = showInlineSidebar || showOverlaySidebar;

  return (
    <View style={styles.container}>
      {showOverlaySidebar && (
        <Pressable style={styles.sidebarBackdrop} onPress={() => setSidebarOpen(false)} />
      )}
      {showSidebar && (
        <View style={[styles.sidebarWrapper, showOverlaySidebar && styles.sidebarOverlay]}>
          <AdminSidebar
            activeScreen={activeScreen}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        </View>
      )}
      <View style={styles.main}>
        <AdminHeader
          title={title}
          onMenuPress={() => setSidebarOpen((prev) => !prev)}
          showMenuButton={isCompact}
          showBackButton={showBackButton}
          onBack={onBack}
        />
        {content}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  sidebarWrapper: {
    flexShrink: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 20,
  },
  sidebarOverlay: {
    position: 'absolute' as any,
    left: 0,
    top: 0,
    bottom: 0,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  sidebarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
    zIndex: 10,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  scrollView: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  nonScrollableContent: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: ADMIN_LAYOUT.contentPaddingVertical,
    paddingBottom: ADMIN_LAYOUT.scrollBottomPadding,
    minWidth: 0,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: ADMIN_LAYOUT.maxContentWidth,
    minWidth: 0,
    alignSelf: 'center',
  },
  contentInner: {
    width: '100%',
    paddingHorizontal: ADMIN_LAYOUT.contentPadding,
  },
});
