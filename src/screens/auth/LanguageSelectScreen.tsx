import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ref, get, set, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { getCurrentUser } from '../../services/firebase/auth';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import { LANGUAGES } from '../../utils/constants';
import { changeLanguage } from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import type { AuthStackParamList, User } from '../../types';

type LanguageSelectNavigationProp = StackNavigationProp<AuthStackParamList, 'LanguageSelect'>;

interface LanguageSelectScreenProps {
  navigation: LanguageSelectNavigationProp;
}

const LANGUAGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  en: 'language-outline',
  hi: 'language-outline',
  gu: 'language-outline',
};

const normalizeEmail = (value?: string): string => (value ?? '').trim().toLowerCase();

const userMatchesEmail = (user: Record<string, unknown>, normalizedEmail: string): boolean => {
  const candidates = [user.email, user.businessEmail, user.contactEmail];
  return candidates.some((candidate) => normalizeEmail(String(candidate ?? '')) === normalizedEmail);
};

const buildFallbackUser = (email: string, language: string): User => {
  const localPart = normalizeEmail(email).split('@')[0] || 'member';
  const nameFromEmail = localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const now = new Date().toISOString();
  return {
    uid: `temp_${Date.now()}`,
    email: normalizeEmail(email),
    name: nameFromEmail || 'Member',
    phone: '',
    photoURL: '',
    businessName: '',
    businessDescription: '',
    businessCategory: '',
    businessTags: [],
    businessPhotos: [],
    socialLinks: { instagram: '', facebook: '', whatsapp: '', linkedin: '' },
    chapterId: '',
    zoneId: '',
    location: { city: '', state: '' },
    dateOfBirth: '',

    language: language as any,
    biometricEnabled: false,
    role: 'member',
    leadershipRole: 'member',
    leadershipRolePoints: 0,
    leadershipRoleCity: '',
    isActive: true,
    profileComplete: false,
    createdAt: now,
    updatedAt: now,
  };
};

async function resolveUser(language: string): Promise<User> {
  try {
    const authUser = getCurrentUser();
    const storedEmail = await AsyncStorage.getItem('netconnect_signin_email');
    const normalizedStoredEmail = normalizeEmail(storedEmail ?? '');
    const effectiveEmail = normalizeEmail(authUser?.email ?? normalizedStoredEmail);

    // Check if admin email
    if (effectiveEmail === 'admin@netconnect.app') {
      const now = new Date().toISOString();
      const adminUser = {
        ...buildFallbackUser(effectiveEmail, language),
        uid: 'admin001',
        role: 'admin' as const,
        leadershipRole: 'member' as const,
        leadershipRolePoints: 0,
        leadershipRoleCity: '',
        profileComplete: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      // Write admin user to RTDB if it doesn't exist
      try {
        const snap = await get(ref(rtdb, `users/${adminUser.uid}`));
        if (!snap.exists()) {
          await set(ref(rtdb, `users/${adminUser.uid}`), adminUser);
        }
      } catch {}
      return adminUser;
    }

    // Primary: resolve by authenticated UID to avoid Auth/RTDB drift.
    if (authUser?.uid) {
      try {
        const snap = await get(ref(rtdb, `users/${authUser.uid}`));
        if (snap.exists()) {
          const userData = snap.val() as Record<string, unknown>;
          await update(ref(rtdb, `users/${authUser.uid}`), {
            language,
            updatedAt: new Date().toISOString(),
          });
          return { ...(userData as unknown as User), uid: authUser.uid, language: language as any };
        }
      } catch {}
    }

    // Fallback: legacy lookup by stored email (only when no auth user is available).
    if (!authUser?.uid && effectiveEmail) {
      try {
        const snap = await get(ref(rtdb, 'users'));
        if (snap.exists()) {
          const users = snap.val() as Record<string, Record<string, unknown>>;
          const match = Object.entries(users).find(([, user]) => userMatchesEmail(user, effectiveEmail));
          if (match) {
            const [uid, userData] = match;
            await update(ref(rtdb, `users/${uid}`), {
              language,
              updatedAt: new Date().toISOString(),
            });
            return { ...(userData as unknown as User), uid, language: language as any };
          }
        }
      } catch {}
    }

    return buildFallbackUser(effectiveEmail, language);
  } catch {
    return buildFallbackUser('', language);
  }
}

const LanguageSelectScreen: React.FC<LanguageSelectScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const [isSaving, setIsSaving] = useState(false);
  const [checkingLanguage, setCheckingLanguage] = useState(true);

  // Auto-skip if language was previously saved
  useEffect(() => {
    const checkSavedLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('user-language');
        if (savedLang) {
          // Language already selected before — skip this screen
          await changeLanguage(savedLang);
          const user = await resolveUser(savedLang);
          setUser(user);
          return;
        }
      } catch {
        // Ignore errors
      }
      setCheckingLanguage(false);
    };
    checkSavedLanguage();
  }, [setUser]);

  const handleSelect = useCallback((langCode: string) => {
    setSelectedLanguage(langCode);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      await changeLanguage(selectedLanguage);
      await AsyncStorage.setItem('user-language', selectedLanguage);

      // Resolve user from RTDB for authenticated email
      const resolvedUser = await resolveUser(selectedLanguage);
      setUser(resolvedUser);
    } catch {
      // Fallback
    } finally {
      setIsSaving(false);
    }
  }, [selectedLanguage, setUser]);

  if (checkingLanguage) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogo}>
          <Ionicons name="globe-outline" size={48} color={colors.primary} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.splashText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false} edges={['top', 'bottom']}>
      <Header
        title={t('languageSelect.title', 'Choose Language')}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <View style={styles.container}>
        {/* Description */}
        <View style={styles.descriptionSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="language-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.heading}>
            {t('languageSelect.heading', 'Select Your Preferred Language')}
          </Text>
          <Text style={styles.description}>
            {t(
              'languageSelect.description',
              'Choose the language you would like to use throughout the app. You can change this later in Settings.',
            )}
          </Text>
        </View>

        {/* Language options */}
        <View style={styles.languageList}>
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.code;

            return (
              <TouchableOpacity
                key={lang.code}
                activeOpacity={0.7}
                onPress={() => handleSelect(lang.code)}
              >
                <Card
                  style={isSelected ? { ...styles.languageCard, ...styles.languageCardSelected } : styles.languageCard}
                  elevated={isSelected}
                  padded={false}
                >
                  <View style={styles.languageCardInner}>
                    {/* Radio indicator */}
                    <View
                      style={[
                        styles.radio,
                        isSelected && styles.radioSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>

                    {/* Language info */}
                    <View style={styles.languageInfo}>
                      <Text
                        style={[
                          styles.languageNativeLabel,
                          isSelected && styles.languageNativeLabelSelected,
                        ]}
                      >
                        {lang.nativeLabel}
                      </Text>
                      <Text style={styles.languageEnglishLabel}>{lang.label}</Text>
                    </View>

                    {/* Checkmark */}
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Save button */}
        <View style={styles.buttonSection}>
          <Button
            title={
              isSaving
                ? t('languageSelect.saving', 'Saving...')
                : t('languageSelect.saveAndContinue', 'Save & Continue')
            }
            onPress={handleSave}
            size="lg"
            fullWidth
            loading={isSaving}
            disabled={isSaving}
            icon="checkmark-outline"
            iconPosition="right"
          />
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  splashLogo: {
    marginBottom: spacing.xl,
  },
  splashText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  descriptionSection: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  languageList: {
    gap: spacing.lg,
  },
  languageCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  languageCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  languageCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  languageInfo: {
    flex: 1,
  },
  languageNativeLabel: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 2,
  },
  languageNativeLabelSelected: {
    color: colors.primaryDark,
  },
  languageEnglishLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  buttonSection: {
    paddingBottom: Platform.OS === 'ios' ? spacing['3xl'] : spacing['2xl'],
    paddingTop: spacing.lg,
  },
});

export default LanguageSelectScreen;
