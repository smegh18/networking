import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, typography, spacing, borderRadius, layout, breakpoints, shadows } from '../../theme';
import type { AuthStackParamList } from '../../types';
import { sendOTPEmail } from '../../services/firebase/auth';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;
type LoginScreenRouteProp = RouteProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
  route: LoginScreenRouteProp;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isRegisterMode = route.params?.mode === 'register';
  const isWideWeb = Platform.OS === 'web' && width > breakpoints.lg;
  const cardStyle = isWideWeb ? { ...styles.card, ...styles.webCard } : styles.card;
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isRegisterMode) {
      navigation.replace('PhoneLogin');
    }
  }, [isRegisterMode, navigation]);

  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setEmailError(t('login.errorRequired', 'Email address is required'));
      return false;
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError(t('login.errorInvalid', 'Please enter a valid email address'));
      return false;
    }
    setEmailError('');
    return true;
  }, [t]);

  const handleSendOTP = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) return;
    const normalizedEmail = trimmedEmail.toLowerCase();

    setIsLoading(true);
    setEmailError('');
    try {
      await sendOTPEmail(normalizedEmail);
      navigation.navigate('OTPVerification', { email: normalizedEmail });
    } catch (err: unknown) {
      const message = err && typeof (err as { message?: string }).message === 'string'
        ? (err as { message: string }).message
        : t('login.errorSending', 'Failed to send OTP. Please try again.');
      const code = err && typeof (err as { code?: string }).code === 'string' ? (err as { code: string }).code : '';
      if (typeof console !== 'undefined' && console.error) {
        console.error('[Login] sendOTP failed', code, err);
      }
      setEmailError(message);
      Alert.alert(
        t('login.errorTitle', 'Error'),
        message + (code ? ` (${code})` : ''),
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, navigation, t, validateEmail]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    if (emailError) setEmailError('');
  }, [emailError]);

  if (!isRegisterMode) return null;

  return (
    <ScreenWrapper padded={false}>
      <Header title={t('register.verifyEmailTitle', 'Create account')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={[styles.container, isWideWeb && styles.webContainer]}>
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationCircle}>
              <Ionicons name="mail-outline" size={48} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.heading}>{t('register.verifyEmailHeading', 'Verify your email')}</Text>
          <Text style={styles.description}>
            {t('register.verifyEmailDescription', 'Enter your email address and we will send you a one-time verification code to create your account.')}
          </Text>

          <Card style={cardStyle} elevated={false}>
            <TextInput
              label={t('login.emailLabel', 'Email Address')}
              placeholder={t('login.emailPlaceholder', 'you@example.com')}
              value={email}
              onChangeText={handleEmailChange}
              error={emailError}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={handleSendOTP}
              editable={!isLoading}
            />
            <Button
              title={isLoading ? t('login.sending', 'Sending...') : t('login.sendOTP', 'Send OTP')}
              onPress={handleSendOTP}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              size="lg"
              icon={isLoading ? undefined : 'send-outline'}
              iconPosition="right"
            />
          </Card>

          <View style={styles.infoContainer}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text style={styles.infoText}>
              {t('register.emailOtpInfo', 'We verify your email with a one-time code for account creation.')}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
    minHeight: 400,
  },
  webContainer: {
    maxWidth: layout.maxFormWidth,
    paddingHorizontal: layout.webPadding,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  illustrationCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    lineHeight: 24,
  },
  card: {
    padding: spacing.xl,
    marginBottom: spacing['3xl'],
  },
  webCard: {
    padding: layout.webCardPadding,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.textTertiary,
    flex: 1,
  },
});

export default LoginScreen;
