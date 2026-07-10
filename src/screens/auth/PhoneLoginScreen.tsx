import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { getCurrentUser, onAuthStateChanged, signOut as appSignOut } from '../../services/firebase/auth';
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
const PHONE_OTP_VERIFY_TIMEOUT_MS = 25_000;
const ACCOUNT_COMPLETION_TIMEOUT_MS = 30_000;

type PhoneAuthSession = {
  id: number;
  phoneDigits: string;
  phoneE164: string;
  mode: 'login' | 'register';
  confirmation: PhoneOtpResult | null;
  completed: boolean;
};

const phoneTail = (value: string | null | undefined): string =>
  String(value ?? '').replace(/\D/g, '').slice(-10);

const logPhoneAuth = (stage: string, payload?: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.log(`[PhoneAuth] ${stage}`, payload ?? {});
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([
    promise.finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    }),
    timeoutPromise,
  ]);
};

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
  const activeSessionRef = useRef<PhoneAuthSession | null>(null);
  const nextSessionIdRef = useRef(0);
  const otpRequestInFlightRef = useRef(false);
  const didUnmountRef = useRef(false);

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
    didUnmountRef.current = false;
    return () => {
      didUnmountRef.current = true;
      activeSessionRef.current = null;
      otpRequestInFlightRef.current = false;
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

  const clearOtpSession = useCallback(() => {
    activeSessionRef.current = null;
    setConfirmationResult(null);
    setOtp('');
    setOtpError('');
  }, []);

  const completePhoneAuth = useCallback(async (
    firebaseUser: { uid?: string; phoneNumber?: string | null; email?: string | null },
    session: PhoneAuthSession,
    source: 'manual' | 'auth_state',
  ) => {
    if (!firebaseUser?.uid) return;

    const firebasePhoneTail = phoneTail(firebaseUser.phoneNumber);
    if (firebasePhoneTail && firebasePhoneTail !== session.phoneDigits) {
      logPhoneAuth('AUTH_STATE_IGNORED_PHONE_MISMATCH', {
        sessionId: session.id,
        expectedPhone: session.phoneE164,
        firebasePhone: firebaseUser.phoneNumber,
        source,
      });
      return;
    }

    activeSessionRef.current = {
      ...session,
      completed: true,
    };

    logPhoneAuth('AUTH_COMPLETE_START', {
      sessionId: session.id,
      source,
      uid: firebaseUser.uid,
      phoneNumber: firebaseUser.phoneNumber,
    });

    const resolvedFirebaseUser = firebaseUser as Parameters<typeof resolveUserProfileForFirebaseUser>[0];
    let matchedProfile: Awaited<ReturnType<typeof resolveUserProfileForFirebaseUser>> | null = null;
    try {
      matchedProfile = await withTimeout(
        (async () => {
          const directProfile = await resolveUserProfileForFirebaseUser(resolvedFirebaseUser);
          if (directProfile) return directProfile;
          return findUserProfileByPhone(firebaseUser.phoneNumber || session.phoneE164);
        })(),
        ACCOUNT_COMPLETION_TIMEOUT_MS,
        'Account setup is taking too long. Please try again.',
      );
    } catch (profileErr) {
      logPhoneAuth('AUTH_COMPLETE_PROFILE_TIMEOUT', {
        sessionId: session.id,
        error: profileErr instanceof Error ? profileErr.message : String(profileErr),
      });
    }

    if (didUnmountRef.current) return;

    setConfirmationResult(null);
    setOtp('');
    setOtpError('');

    if (session.mode === 'register') {
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
        routes: [{ name: 'Register', params: { phone: session.phoneDigits } }],
      });
      return;
    }

    if (matchedProfile) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'BiometricSetup' }],
      });
      return;
    }

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
  }, [navigation, setNewUser, t]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      logPhoneAuth('AUTH_STATE', {
        uid: firebaseUser?.uid,
        phoneNumber: firebaseUser?.phoneNumber,
      });
      if (!firebaseUser?.uid) return;

      const session = activeSessionRef.current;
      if (!session || session.completed) return;

      const firebasePhoneTail = phoneTail(firebaseUser.phoneNumber);
      if (firebasePhoneTail && firebasePhoneTail !== session.phoneDigits) return;

      setIsVerifying(true);
      void completePhoneAuth(firebaseUser, session, 'auth_state')
        .catch((err) => {
          logPhoneAuth('AUTH_STATE_COMPLETE_FAILED', {
            sessionId: session.id,
            error: err instanceof Error ? err.message : String(err),
          });
        })
        .finally(() => {
          if (!didUnmountRef.current) setIsVerifying(false);
        });
    });

    return unsubscribe;
  }, [completePhoneAuth]);

  const handleSendOtp = useCallback(async () => {
    if (otpRequestInFlightRef.current) return;
    if (normalizedPhone.length !== 10) {
      setPhoneError(t('login.phoneInvalid', 'Enter a valid 10-digit mobile number'));
      return;
    }
    setPhoneError('');
    setIsSendingOtp(true);
    otpRequestInFlightRef.current = true;
    const session: PhoneAuthSession = {
      id: ++nextSessionIdRef.current,
      phoneDigits: normalizedPhone,
      phoneE164,
      mode: isRegisterMode ? 'register' : 'login',
      confirmation: null,
      completed: false,
    };
    activeSessionRef.current = session;
    logPhoneAuth('PHONE', { sessionId: session.id, phoneNumber: phoneE164, mode: session.mode });
    try {
      // Before sending OTP, ensure this phone is already registered in RTDB.
      const registeredUser = isRegisterMode ? null : await findUserProfileByPhone(normalizedPhone);
      if (!isRegisterMode && !registeredUser) {
        otpRequestInFlightRef.current = false;
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
        const nextSession = activeSessionRef.current;
        if (!nextSession || nextSession.id !== session.id || nextSession.completed) return;
        nextSession.confirmation = result;
        logPhoneAuth('CONFIRMATION', {
          sessionId: session.id,
          hasConfirm: typeof (result as { confirm?: unknown }).confirm === 'function',
        });
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
      otpRequestInFlightRef.current = false;
      setIsSendingOtp(false);
    }
  }, [isRegisterMode, navigation, normalizedPhone, phoneE164, t]);

  const handleResendOtp = useCallback(async () => {
    if (!canResend || normalizedPhone.length !== 10 || otpRequestInFlightRef.current) return;

    otpRequestInFlightRef.current = true;
    setIsResendingOtp(true);
    setOtp('');
    setOtpError('');
    const session: PhoneAuthSession = {
      id: ++nextSessionIdRef.current,
      phoneDigits: normalizedPhone,
      phoneE164,
      mode: isRegisterMode ? 'register' : 'login',
      confirmation: null,
      completed: false,
    };
    activeSessionRef.current = session;
    logPhoneAuth('PHONE_RESEND', { sessionId: session.id, phoneNumber: phoneE164, mode: session.mode });
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
        const nextSession = activeSessionRef.current;
        if (!nextSession || nextSession.id !== session.id || nextSession.completed) return;
        nextSession.confirmation = result;
        logPhoneAuth('CONFIRMATION', {
          sessionId: session.id,
          hasConfirm: typeof (result as { confirm?: unknown }).confirm === 'function',
        });
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
      otpRequestInFlightRef.current = false;
      setIsResendingOtp(false);
    }
  }, [canResend, isRegisterMode, normalizedPhone, phoneE164, t]);

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
    const session = activeSessionRef.current;
    if (!session || session.completed || session.confirmation !== confirmation) {
      setOtpError(t('login.sessionExpired', 'Please request a new code.'));
      return;
    }
    setOtpError('');
    setIsVerifying(true);
    logPhoneAuth('OTP_CODE', { sessionId: session.id, phoneNumber: session.phoneE164, code });
    try {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const userCred = await Promise.race([
        (confirmation as {
          confirm: (c: string) => Promise<{ user: { uid?: string; phoneNumber?: string | null; email?: string | null } }>;
        }).confirm(code),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Phone verification timed out. Please try again.'));
          }, PHONE_OTP_VERIFY_TIMEOUT_MS);
        }),
      ]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
      logPhoneAuth('CONFIRM_SUCCESS', {
        sessionId: session.id,
        uid: userCred?.user?.uid,
        phoneNumber: userCred?.user?.phoneNumber,
      });
      const firebaseUser = userCred?.user;
      if (!firebaseUser?.uid) {
        setIsVerifying(false);
        return;
      }
      await withTimeout(
        completePhoneAuth(firebaseUser, session, 'manual'),
        ACCOUNT_COMPLETION_TIMEOUT_MS,
        'Account setup is taking too long. Please try again.',
      );
    } catch (err) {
      logPhoneAuth('CONFIRM_FAILED', {
        sessionId: session.id,
        error: err instanceof Error ? err.message : String(err),
        code: err && typeof (err as { code?: unknown }).code === 'string' ? (err as { code: string }).code : '',
      });
      const currentUser = getCurrentUser();
      if (
        currentUser?.uid
        && activeSessionRef.current?.id === session.id
        && !activeSessionRef.current.completed
        && phoneTail(currentUser.phoneNumber) === session.phoneDigits
      ) {
        try {
          await completePhoneAuth(currentUser, session, 'auth_state');
        } catch (completeErr) {
          logPhoneAuth('AUTH_STATE_COMPLETE_FAILED', {
            sessionId: session.id,
            error: completeErr instanceof Error ? completeErr.message : String(completeErr),
          });
          setOtpError(
            completeErr instanceof Error && completeErr.message
              ? completeErr.message
              : t('otp.errorVerification', 'Invalid or expired code. Please try again or resend.'),
          );
        }
        return;
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : t('otp.errorVerification', 'Invalid or expired code. Please try again or resend.');
      setOtpError(message);
    } finally {
      setIsVerifying(false);
    }
  }, [otp, confirmationResult, completePhoneAuth, t]);

  const showOtpStep = !!confirmationResult;

  return (
    <ScreenWrapper padded={false} scrollable={true} edges={['top', 'bottom']} contentStyle={styles.screenContent}>
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
                clearOtpSession();
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
  screenContent: {
    flexGrow: 1,
  },
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xl,
    justifyContent: 'flex-start',
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
