import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { signOut } from '../../services/firebase/auth';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import type { ProfileStackParamList } from '../../types';

type Props = StackScreenProps<ProfileStackParamList, 'Settings'>;

const APP_VERSION = '1.0.0';

// ── Screen ─────────────────────────────────────────────────────────────────────

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } finally {
            clearAuth();
          }
        },
      },
    ]);
  };

  const settingsSections = [
    {
      title: t('settings.preferences'),
      items: [
        {
          key: 'language',
          icon: 'language-outline' as keyof typeof Ionicons.glyphMap,
          label: t('settings.language'),
          type: 'navigate' as const,
          onPress: () => navigation.navigate('LanguageSettings'),
        },
        {
          key: 'biometric',
          icon: 'finger-print-outline' as keyof typeof Ionicons.glyphMap,
          label: t('settings.biometric'),
          type: 'toggle' as const,
          value: biometricEnabled,
          onToggle: setBiometricEnabled,
        },
        {
          key: 'notifications',
          icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
          label: t('settings.pushNotifications'),
          type: 'toggle' as const,
          value: pushNotifications,
          onToggle: setPushNotifications,
        },
      ],
    },
    {
      title: t('settings.about'),
      items: [
        {
          key: 'aboutApp',
          icon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
          label: t('settings.aboutApp'),
          type: 'navigate' as const,
          onPress: () => {},
        },
        {
          key: 'privacy',
          icon: 'shield-outline' as keyof typeof Ionicons.glyphMap,
          label: t('settings.privacyPolicy'),
          type: 'navigate' as const,
          onPress: () => {},
        },
        {
          key: 'terms',
          icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
          label: t('settings.termsOfService'),
          type: 'navigate' as const,
          onPress: () => {},
        },
        {
          key: 'aboutDeveloper',
          icon: 'code-slash-outline' as keyof typeof Ionicons.glyphMap,
          label: t('settings.aboutDeveloper'),
          type: 'navigate' as const,
          onPress: () => {
            Alert.alert(
              t('settings.aboutDeveloper'),
              t('settings.developerInfo', 'Built with passion for business networking.'),
            );
          },
        },
      ],
    },
  ];

  return (
    <ScreenWrapper uniformLayout>
      <Header title={t('settings.title')} onBack={() => navigation.goBack()} />

      {settingsSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card style={styles.sectionCard} padded={false}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.settingRow,
                  index < section.items.length - 1 && styles.settingRowBorder,
                ]}
                onPress={item.type === 'navigate' ? item.onPress : undefined}
                activeOpacity={item.type === 'navigate' ? 0.7 : 1}
                disabled={item.type === 'toggle'}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                </View>
                {item.type === 'navigate' && (
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                )}
                {item.type === 'toggle' && (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={item.value ? colors.primary : colors.surface}
                  />
                )}
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ))}

      {/* Logout */}
      <Button
        title={t('settings.logout')}
        onPress={handleLogout}
        variant="danger"
        icon="log-out-outline"
        fullWidth
        style={styles.logoutButton}
      />

      {/* Version */}
      <Text style={styles.version}>
        {t('settings.version')} {APP_VERSION}
      </Text>
    </ScreenWrapper>
  );
};

export default SettingsScreen;

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing['3xl'],
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  logoutButton: {
    marginTop: spacing.xl,
  },
  version: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['2xl'],
    marginBottom: spacing['4xl'],
  },
});
