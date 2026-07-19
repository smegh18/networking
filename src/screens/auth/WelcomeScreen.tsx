import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows, layout } from '../../theme';
import { LANGUAGES } from '../../utils/constants';
import { changeLanguage } from '../../i18n';
import type { AuthStackParamList } from '../../types';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

interface WelcomeScreenProps {
  navigation: WelcomeScreenNavigationProp;
}

const MOBILE_BREAKPOINT = 400;

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const compact = width < MOBILE_BREAKPOINT;
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');

  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLanguage(langCode);
    await changeLanguage(langCode);
  };

  const handleLogin = () => {
    navigation.navigate('PhoneLogin');
  };

  const handleRegister = () => {
    navigation.navigate('PhoneLogin', { mode: 'register' });
  };

  const isAppDomain = Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname.startsWith('app');

  return (
    <ScreenWrapper scrollable padded={false} edges={['top', 'bottom']} contentStyle={styles.scrollContent}>
      <View style={[styles.container, compact && styles.containerCompact]}>
        {/* Top decorative circles */}
        <View style={[styles.decorationContainer, compact && styles.decorationContainerCompact]}>
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />
          <View style={[styles.decorCircle, styles.decorCircle3]} />
        </View>

        {/* Main content */}
        <View style={[styles.content, compact && styles.contentCompact]}>
          {/* Logo area */}
          <View style={[styles.logoContainer, compact && styles.logoContainerCompact]}>
            <View style={[styles.logoCircle, compact && styles.logoCircleCompact]}>
              <Image
                source={require('../../../assets/logo.png')}
                style={[styles.logoImage, compact && styles.logoImageCompact]}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* App name */}
          <Text style={[styles.appName, compact && styles.appNameCompact]}>{t('common.appName')}</Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
            {t('welcome.subtitle', 'Your trusted business networking platform')}
          </Text>

          {/* Feature highlights */}
          <View style={[styles.featuresContainer, compact && styles.featuresContainerCompact]}>
            <View style={[styles.featureRow, compact && styles.featureRowCompact]}>
              <View style={[styles.featureIcon, compact && styles.featureIconCompact]}>
                <Ionicons name="people-outline" size={compact ? 16 : 20} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, compact && styles.featureTextCompact]} numberOfLines={2}>
                {t('welcome.feature1', 'Connect with business professionals')}
              </Text>
            </View>
            <View style={[styles.featureRow, compact && styles.featureRowCompact]}>
              <View style={[styles.featureIcon, compact && styles.featureIconCompact]}>
                <Ionicons name="trending-up-outline" size={compact ? 16 : 20} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, compact && styles.featureTextCompact]} numberOfLines={2}>
                {t('welcome.feature2', 'Grow your network and referrals')}
              </Text>
            </View>
            <View style={[styles.featureRow, compact && styles.featureRowCompact]}>
              <View style={[styles.featureIcon, compact && styles.featureIconCompact]}>
                <Ionicons name="briefcase-outline" size={compact ? 16 : 20} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, compact && styles.featureTextCompact]} numberOfLines={2}>
                {t('welcome.feature3', 'Track meetings and opportunities')}
              </Text>
            </View>
          </View>

          {/* Auth buttons */}
          <View style={[styles.authButtons, compact && styles.authButtonsCompact]}>
            <Button
              title={t('auth.login', 'Login')}
              onPress={handleLogin}
              size={compact ? 'md' : 'lg'}
              fullWidth
              icon="log-in-outline"
              iconPosition="right"
            />
            <TouchableOpacity style={[styles.registerButton, compact && styles.registerButtonCompact]} onPress={handleRegister} activeOpacity={0.7}>
              <Text style={styles.registerButtonText}>{t('auth.register', 'Register')}</Text>
              <Ionicons name="person-add-outline" size={compact ? 16 : 18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Language selection — kept below auth so nothing overlaps on small screens */}
        <View style={[styles.languageSection, compact && styles.languageSectionCompact]}>
          <Text style={styles.languageLabel}>
            {t('welcome.selectLanguage', 'Select Language')}
          </Text>
          <View style={[styles.languageRow, compact && styles.languageRowCompact]}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageChip,
                  compact && styles.languageChipCompact,
                  selectedLanguage === lang.code && styles.languageChipActive,
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageChipText,
                    compact && styles.languageChipTextCompact,
                    selectedLanguage === lang.code && styles.languageChipTextActive,
                  ]}
                >
                  {lang.nativeLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!isAppDomain && (
          <TouchableOpacity
            style={styles.adminLink}
            onPress={() => navigation.navigate('AdminLogin')}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t('auth.adminLogin', 'Admin Login')}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.adminLinkText}>{t('auth.adminLogin', 'Admin Login')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  containerCompact: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  decorationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: 'hidden',
  },
  decorationContainerCompact: {
    height: 120,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: borderRadius.full,
    opacity: 0.08,
  },
  decorCircle1: {
    width: 200,
    height: 200,
    backgroundColor: colors.primary,
    top: -60,
    right: -40,
  },
  decorCircle2: {
    width: 140,
    height: 140,
    backgroundColor: colors.accent,
    top: -20,
    left: -30,
  },
  decorCircle3: {
    width: 80,
    height: 80,
    backgroundColor: colors.secondary,
    top: 60,
    right: 60,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingTop: spacing['3xl'],
    marginBottom: spacing.xl,
  },
  contentCompact: {
    paddingTop: spacing.lg,
    marginBottom: spacing.md,
  },
  logoContainer: {
    marginBottom: spacing['2xl'],
    alignItems: 'center',
  },
  logoContainerCompact: {
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.lg,
  },
  logoCircleCompact: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 9999,
  },
  logoImageCompact: {
    width: 48,
    height: 48,
    borderRadius: 9999,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  appNameCompact: {
    fontSize: 26,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
  },
  subtitleCompact: {
    fontSize: 13,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: spacing['4xl'],
    paddingHorizontal: spacing.sm,
  },
  featuresContainerCompact: {
    marginBottom: spacing.lg,
    paddingHorizontal: 0,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  featureRowCompact: {
    marginBottom: spacing.sm,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  featureIconCompact: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  featureTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  authButtons: {
    width: '100%',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  authButtonsCompact: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  registerButtonCompact: {
    paddingVertical: spacing.md,
  },
  registerButtonText: {
    ...typography.bodySemiBold,
    color: colors.primary,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  adminLinkText: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
  },
  languageSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  languageSectionCompact: {
    paddingTop: spacing.lg,
    marginTop: spacing.sm,
  },
  languageLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  languageRowCompact: {
    gap: spacing.sm,
  },
  languageChip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  languageChipCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  languageChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  languageChipText: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
  },
  languageChipTextCompact: {
    fontSize: 11,
  },
  languageChipTextActive: {
    color: colors.primary,
  },
});

export default WelcomeScreen;
