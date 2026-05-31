import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { sendPhoneOtp, getRecaptchaContainerId, resetWebRecaptchaVerifier } from '../../services/firebase/phoneAuth';
import type { PhoneOtpResult } from '../../services/firebase/phoneAuth';
import { signOut as appSignOut } from '../../services/firebase/auth';
import { findUserProfileByPhone, resolveUserProfileForFirebaseUser } from '../../services/firebase/userProfile';
import { setPendingRegistration } from '../../services/onboarding/pendingRegistration';
import { useAuthStore } from '../../stores/authStore';

import { colors, typography, spacing, layout, shadows } from '../../theme';
import type { AuthStackParamList } from '../../types';

type Props = StackScreenProps<AuthStackParamList, 'PhoneLogin'>;

const DEFAULT_COUNTRY_CODE = '+91';
const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 60;
const PHONE_OTP_SEND_TIMEOUT_MS = 25_000;

const PhoneLoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const setNewUser = useAuthStore((s) => s.setNewUser);
  const isRegisterMode = route.params?.mode === 'register';

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<PhoneOtpResult | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const resendIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizedPhone = phone.replace(/\D/g, '');
  const phoneE164 = normalizedPhone.length === 10 ? `${DEFAULT_COUNTRY_CODE}${normalizedPhone}` : '';

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    resetWebRecaptchaVerifier();
    return () => {
      resetWebRecaptchaVerifier();
    };
  }, []);

  useEffect(() => {
    if (!confirmationResult) {
      setCanResend(false);
      setResendTimer(RESEND_TIMER_SECONDS);
      if (resendIntervalRef.current) {
        clearInterval(resendIntervalRef.current);
        resendIntervalRef.current = null;
      }
      return;
    }

    setCanResend(false);
    setResendTimer(RESEND_TIMER_SECONDS);
    if (resendIntervalRef.current) clearInterval(resendIntervalRef.current);
    resendIntervalRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (resendIntervalRef.current) {
            clearInterval(resendIntervalRef.current);
            resendIntervalRef.current = null;
          }
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (resendIntervalRef.current) {
        clearInterval(resendIntervalRef.current);
        resendIntervalRef.current = null;
      }
    };
  }, [confirmationResult]);

  const handleSendOtp = useCallback(async () => {
    if (normalizedPhone.length !== 10) {
      setPhoneError(t('login.phoneInvalid', 'Enter a valid 10-digit mobile number'));
      return;
    }
    setPhoneError('');
    setIsSendingOtp(true);
    try {
      // Before sending OTP, ensure this phone is already registered in RTDB.
      const registeredUser = isRegisterMode ? null : await findUserProfileByPhone(normalizedPhone);
      if (!isRegisterMode && !registeredUser) {

        setIsSendingOtp(false);
        Alert.alert(
          t('login.title', 'Login'),
          t(
            'login.phoneNotRegistered',
            'This mobile number is not registered. Please create an account first.',
          ),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
              text: t('auth.register', 'Create Account'),
              onPress: () => {
                navigation.navigate('PhoneLogin', { mode: 'register' });

              },
            },
          ],
        );
        return;
      }

      const verifier = Platform.OS === 'web' ? undefined : undefined;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const result = await Promise.race([
        sendPhoneOtp(phoneE164, verifier),
        new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('OTP request timed out. Please try again.')), PHONE_OTP_SEND_TIMEOUT_MS);
        }),
      ]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
      if (result) {
        setConfirmationResult(result);
      } else {
        Alert.alert(t('common.error', 'Error'), t('login.errorSending', 'Failed to send OTP. Please try again.'));
      }
    } catch (err: unknown) {
      const message = err && typeof (err as { message?: string }).message === 'string'
        ? (err as { message: string }).message
        : t('login.errorSending', 'Failed to send OTP. Please try again.');
      Alert.alert(t('login.errorTitle', 'Error'), message);
    } finally {
      setIsSendingOtp(false);
    }
  }, [isRegisterMode, navigation, normalizedPhone, phoneE164, t]);


  const handleResendOtp = useCallback(async () => {
    if (!canResend || normalizedPhone.length !== 10) return;

    setIsResendingOtp(true);
    setOtp('');
    setOtpError('');
    try {
      const verifier = Platform.OS === 'web' ? undefined : undefined;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const result = await Promise.race([
        sendPhoneOtp(phoneE164, verifier),
        new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('OTP request timed out. Please try again.')), PHONE_OTP_SEND_TIMEOUT_MS);
        }),
      ]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
      if (result) {
        setConfirmationResult(result);
        Alert.alert(
          t('otp.resentTitle', 'OTP Resent'),
          t('register.otpSentToPhone', 'A verification code has been sent to {{phone}}', { phone: normalizedPhone }),
        );
      } else {
        Alert.alert(t('common.error', 'Error'), t('login.errorSending', 'Failed to send OTP. Please try again.'));
      }
    } catch (err: unknown) {
      const message = err && typeof (err as { message?: string }).message === 'string'
        ? (err as { message: string }).message
        : t('login.errorSending', 'Failed to send OTP. Please try again.');
      Alert.alert(t('login.errorTitle', 'Error'), message);
    } finally {
      setIsResendingOtp(false);
    }
  }, [canResend, normalizedPhone, phoneE164, t]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOtp = useCallback(async () => {
    const code = otp.replace(/\D/g, '');
    if (code.length !== OTP_LENGTH) {
      setOtpError(t('otp.errorIncomplete', 'Please enter the complete 6-digit code'));
      return;
    }
    const confirmation = confirmationResult;
    if (!confirmation) {
      setOtpError(t('login.sessionExpired', 'Please request a new code.'));
      return;
    }
    setOtpError('');
    setIsVerifying(true);
    try {
      const userCred = await (confirmation as {
        confirm: (c: string) => Promise<{ user: { uid?: string; phoneNumber?: string | null; email?: string | null } }>;
      }).confirm(code);
      const firebaseUser = userCred?.user;
      if (!firebaseUser?.uid) {
        setIsVerifying(false);
        return;
      }
      const resolvedFirebaseUser = firebaseUser as Parameters<typeof resolveUserProfileForFirebaseUser>[0];
      const matchedProfile =
        await resolveUserProfileForFirebaseUser(resolvedFirebaseUser)
        || await findUserProfileByPhone(firebaseUser.phoneNumber || phoneE164);

      setConfirmationResult(null);
      setOtp('');
      if (isRegisterMode) {
        if (matchedProfile?.profileComplete !== false && matchedProfile?.businessName) {
          setNewUser(false);
          navigation.reset({
            index: 0,
            routes: [{ name: 'BiometricSetup' }],
          });
          return;
        }

        setNewUser(true);
        try {
          await setPendingRegistration(firebaseUser.uid);
        } catch {
          // ignore
        }
        navigation.reset({
          index: 0,
          routes: [{ name: 'Register', params: { phone: normalizedPhone } }],
        });
        return;
      }


      if (matchedProfile) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'BiometricSetup' }],
        });
      } else {
        // Number is not registered in RTDB: sign out and show dialog.
        try {
          await appSignOut();
        } catch {
          // ignore sign out errors here; we just don't want to keep the session
        }
        Alert.alert(
          t('login.title', 'Login'),
          t(
            'login.phoneNotRegistered',
            'This mobile number is not registered. Please create an account first.',
          ),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
              text: t('auth.register', 'Create Account'),
              onPress: () => navigation.navigate('PhoneLogin', { mode: 'register' }),

            },
          ],
        );
      }
    } catch {
      setOtpError(t('otp.errorVerification', 'Invalid or expired code. Please try again or resend.'));
    } finally {
      setIsVerifying(false);
    }
  }, [isRegisterMode, normalizedPhone, otp, confirmationResult, navigation, phoneE164, setNewUser, t]);


  const showOtpStep = !!confirmationResult;

  return (
    <ScreenWrapper padded={false} scrollable={false}>
      <Header title={isRegisterMode ? t('register.title', 'Create Account') : t('login.title', 'Login')} onBack={() => navigation.goBack()} />

      <View style={styles.container}>
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="call-outline" size={48} color={colors.primary} />
          </View>
        </View>
        <Text style={styles.heading}>
          {showOtpStep
            ? t('login.verifyOtpHeading', 'Enter verification code')
            : isRegisterMode
              ? t('register.verifyPhoneHeading', 'Verify your mobile number')
              : t('login.phoneHeading', 'Login with mobile number')}

        </Text>
        <Text style={styles.description}>
          {showOtpStep
            ? t('login.otpSentToPhone', 'We sent a 6-digit code to {{phone}}', {
                phone: `${DEFAULT_COUNTRY_CODE} ${normalizedPhone}`,
              })
            : isRegisterMode
              ? t('register.verifyPhoneDescription', 'Enter your mobile number first. This number will be used to create your account.')
              : t('login.phoneDescription', 'Enter your 10-digit mobile number to receive an OTP.')}

        </Text>

        {!showOtpStep ? (
          <Card style={styles.card} elevated={false}>
            <View style={styles.phoneRow}>
              <Text style={styles.countryCode}>{DEFAULT_COUNTRY_CODE}</Text>
              <RNTextInput
                style={styles.phoneInput}
                placeholder={t('login.phonePlaceholder', '9876543210')}
                placeholderTextColor={colors.textTertiary}
                value={phone.replace(/\D/g, '')}
                onChangeText={(v) => {
                  setPhone(v.replace(/\D/g, '').slice(0, 10));
                  if (phoneError) setPhoneError('');
                }}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!isSendingOtp}
              />
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
            <Button
              title={isSendingOtp ? t('login.sending', 'Sending...') : t('login.sendOTP', 'Send OTP')}
              onPress={handleSendOtp}
              loading={isSendingOtp}
              disabled={isSendingOtp}
              fullWidth
              size="lg"
              icon={isSendingOtp ? undefined : 'send-outline'}
              iconPosition="right"
            />
          </Card>
        ) : (
          <Card style={styles.card} elevated={false}>
            <TextInput
              label={t('otp.codeLabel', 'Verification code')}
              placeholder={t('otp.placeholder', '000000')}
              value={otp}
              onChangeText={(v) => {
                setOtp(v.replace(/\D/g, '').slice(0, OTP_LENGTH));
                if (otpError) setOtpError('');
              }}
              error={otpError}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              editable={!isVerifying}
            />
            <Button
              title={isVerifying ? t('common.loading', 'Verifying...') : t('login.verifyAndLogin', 'Verify & Login')}
              onPress={handleVerifyOtp}
              loading={isVerifying}
              disabled={isVerifying || otp.replace(/\D/g, '').length !== OTP_LENGTH}
              fullWidth
              size="lg"
            />

            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp} disabled={isResendingOtp || isVerifying}>
                  <Text style={styles.resendText}>
                    {isResendingOtp ? t('common.loading', 'Loading...') : t('otp.resendCode', 'Resend Code')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimer}>
                  {t('otp.resendIn', 'Resend code in')}{' '}
                  <Text style={styles.timerText}>{formatTimer(resendTimer)}</Text>
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={() => {
                setConfirmationResult(null);
                setOtp('');
                setOtpError('');
              }}
              disabled={isVerifying}
            >
              <Text style={styles.resendText}>{t('login.useDifferentNumber', 'Use a different number')}</Text>
            </TouchableOpacity>
          </Card>
        )}

        {Platform.OS === 'web' ? (
          <View nativeID={getRecaptchaContainerId()} style={styles.recaptchaPlaceholder} />
        ) : null}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
    minHeight: 400,
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 52,
  },
  countryCode: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    padding: 0,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  resendContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  resendTimer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  timerText: {
    color: colors.primary,
    fontWeight: '600',
  },
  recaptchaPlaceholder: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
  },
  webOnlyHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
});

export default PhoneLoginScreen;
