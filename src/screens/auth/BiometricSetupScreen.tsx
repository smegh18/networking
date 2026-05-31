import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  isBiometricAvailable,
  getBiometricType,
  authenticateWithBiometric,
  saveCredentials,
} from '../../services/biometric';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import type { AuthStackParamList } from '../../types';

type BiometricSetupNavigationProp = StackNavigationProp<AuthStackParamList, 'BiometricSetup'>;

interface BiometricSetupScreenProps {
  navigation: BiometricSetupNavigationProp;
}

const BiometricSetupScreen: React.FC<BiometricSetupScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    // Skip biometric setup on web since it's not supported
    if (Platform.OS === 'web') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'LanguageSelect' }],
      });
      return;
    }

    checkBiometricAvailability();
  }, [navigation]);

  const checkBiometricAvailability = async () => {
    try {
      const available = await isBiometricAvailable();
      setIsAvailable(available);

      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
      }
    } catch (error) {
      setIsAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateForward = useCallback(() => {
    // After biometric setup, go to Main navigator
    // Using CommonActions or reset to clear the auth stack
    navigation.reset({
      index: 0,
      routes: [{ name: 'LanguageSelect' }],
    });
  }, [navigation]);

  const handleEnable = useCallback(async () => {
    setIsEnabling(true);

    try {
      const success = await authenticateWithBiometric();

      if (success) {
        // Save credentials for biometric auto-login
        const storedEmail = await AsyncStorage.getItem('netconnect_signin_email');
        const email = user?.email ?? storedEmail ?? '';
        await saveCredentials(email);

        Alert.alert(
          t('biometric.successTitle', 'Biometric Enabled'),
          t('biometric.successMessage', 'You can now use biometric authentication to log in quickly.'),
          [{ text: t('common.continue', 'Continue'), onPress: navigateForward }],
        );
      } else {
        Alert.alert(
          t('biometric.failedTitle', 'Authentication Failed'),
          t('biometric.failedMessage', 'Biometric authentication was not successful. You can try again or skip.'),
        );
      }
    } catch (error) {
      Alert.alert(
        t('biometric.errorTitle', 'Error'),
        t('biometric.errorMessage', 'Something went wrong. You can try again or skip for now.'),
      );
    } finally {
      setIsEnabling(false);
    }
  }, [user, navigateForward, t]);

  const handleSkip = useCallback(() => {
    navigateForward();
  }, [navigateForward]);

  // Determine the icon based on biometric type
  const biometricIcon: keyof typeof Ionicons.glyphMap =
    biometricType?.includes('Facial')
      ? 'scan-outline'
      : 'finger-print-outline';

  const biometricLabel = biometricType ?? t('biometric.generic', 'Biometric');

  if (isLoading) {
    return (
      <ScreenWrapper scrollable={false} padded={false}>
        <LoadingSpinner
          fullScreen
          message={t('biometric.checking', 'Checking biometric support...')}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Main content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconOuter}>
              <View style={styles.iconInner}>
                <Ionicons name={biometricIcon} size={64} color={colors.primary} />
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {t('biometric.title', 'Enable Biometric Login')}
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            {isAvailable
              ? t(
                  'biometric.description',
                  'Use your {{type}} for quick and secure access to your account. No need to enter email or OTP every time.',
                  { type: biometricLabel },
                )
              : t(
                  'biometric.notAvailable',
                  'Biometric authentication is not available on this device. You can set it up later in Settings.',
                )}
          </Text>

          {/* Feature bullets */}
          {isAvailable && (
            <Card style={styles.featuresCard} elevated={false}>
              <View style={styles.featureItem}>
                <View style={styles.featureBullet}>
                  <Ionicons name="flash-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.featureText}>
                  {t('biometric.feature1', 'Instant login with a touch or glance')}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureBullet}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
                </View>
                <Text style={styles.featureText}>
                  {t('biometric.feature2', 'Your biometric data never leaves your device')}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={styles.featureBullet}>
                  <Ionicons name="key-outline" size={18} color={colors.secondary} />
                </View>
                <Text style={styles.featureText}>
                  {t('biometric.feature3', 'You can disable it anytime from Settings')}
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonSection}>
          {isAvailable ? (
            <>
              <Button
                title={
                  isEnabling
                    ? t('biometric.enabling', 'Enabling...')
                    : t('biometric.enable', 'Enable {{type}}', { type: biometricLabel })
                }
                onPress={handleEnable}
                size="lg"
                fullWidth
                loading={isEnabling}
                disabled={isEnabling}
                icon={biometricIcon}
              />
              <Button
                title={t('biometric.skip', 'Skip for Now')}
                onPress={handleSkip}
                variant="ghost"
                size="lg"
                fullWidth
                style={styles.skipButton}
                disabled={isEnabling}
              />
            </>
          ) : (
            <Button
              title={t('common.continue', 'Continue')}
              onPress={handleSkip}
              size="lg"
              fullWidth
              icon="arrow-forward"
              iconPosition="right"
            />
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  iconContainer: {
    marginBottom: spacing['3xl'],
  },
  iconOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  iconInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing['3xl'],
    lineHeight: 24,
  },
  featuresCard: {
    width: '100%',
    padding: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.borderLight,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  featureBullet: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  buttonSection: {
    paddingBottom: Platform.OS === 'ios' ? spacing['3xl'] : spacing['2xl'],
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  skipButton: {
    marginTop: spacing.sm,
  },
});

export default BiometricSetupScreen;
