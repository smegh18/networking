import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { ref, get } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { getCurrentUser, verifyEmailOtpAndSignIn, sendOTPEmail } from '../../services/firebase/auth';
import { setPendingRegistration } from '../../services/onboarding/pendingRegistration';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import type { AuthStackParamList } from '../../types';

type OTPVerificationNavigationProp = StackNavigationProp<AuthStackParamList, 'OTPVerification'>;
type OTPVerificationRouteProp = RouteProp<AuthStackParamList, 'OTPVerification'>;

interface OTPVerificationScreenProps {
  navigation: OTPVerificationNavigationProp;
  route: OTPVerificationRouteProp;
}

const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 60;
const ADMIN_EMAIL = 'admin@netconnect.app';

const normalizeEmail = (value?: string): string => (value ?? '').trim().toLowerCase();

const userMatchesEmail = (user: Record<string, unknown>, normalizedEmail: string): boolean => {
  const candidates = [user.email, user.businessEmail, user.contactEmail];
  return candidates.some((candidate) => normalizeEmail(String(candidate ?? '')) === normalizedEmail);
};

const isUserProfileComplete = (user: Record<string, unknown>): boolean => {
  if (user.profileComplete === false) return false;
  if (user.profileComplete === true) return true;
  // Legacy records without explicit completion flag.
  return Boolean(String(user.name ?? '').trim() && String(user.businessName ?? '').trim() && String(user.phone ?? '').trim());
};

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useTranslation();
  const { email } = route.params;
  const { setNewUser } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState('');

  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for resend
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleOtpChange = useCallback(
    (value: string, index: number) => {
      if (otpError) setOtpError('');

      // Handle paste of full OTP
      if (value.length > 1) {
        const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
        const newOtp = Array(OTP_LENGTH).fill('');
        digits.split('').forEach((digit, i) => {
          newOtp[i] = digit;
        });
        setOtp(newOtp);
        const nextIndex = Math.min(digits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
        return;
      }

      const digit = value.replace(/\D/g, '');
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Auto-advance to next input
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp, otpError],
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    },
    [otp],
  );

  const handleVerify = useCallback(async () => {
    const otpString = otp.join('');
    if (otpString.length !== OTP_LENGTH) {
      setOtpError(t('otp.errorIncomplete', 'Please enter the complete 6-digit code'));
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    try {
      const normalizedEmail = email.trim().toLowerCase();
      await verifyEmailOtpAndSignIn(normalizedEmail, otpString);

      // Check if user exists in RTDB (profile created during registration)
      let isExisting = false;
      try {
        const uid = getCurrentUser()?.uid;
        if (uid) {
          const snap = await get(ref(rtdb, `users/${uid}`));
          if (snap.exists()) {
            isExisting = isUserProfileComplete(snap.val() as Record<string, unknown>);
          }
        } else {
          const usersRef = ref(rtdb, 'users');
          const allUsersSnap = await get(usersRef);
          if (allUsersSnap.exists()) {
            const users = allUsersSnap.val() as Record<string, Record<string, unknown>>;
            isExisting = Object.values(users).some((u) => userMatchesEmail(u, normalizedEmail) && isUserProfileComplete(u));
          }
        }
        if (!isExisting && normalizedEmail === ADMIN_EMAIL) {
          isExisting = true;
        }
      } catch {
        isExisting = normalizedEmail === ADMIN_EMAIL;
      }

      if (!isExisting) {
        setNewUser(true);
        const uid = getCurrentUser()?.uid;
        if (uid) {
          try {
            await setPendingRegistration(uid);
          } catch {
            // ignore
          }
        }
        navigation.reset({
          index: 0,
          routes: [{ name: 'Register', params: { email: normalizedEmail } }],
        });
      } else {
        setNewUser(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'BiometricSetup' }],
        });
      }
    } catch {
      setOtpError(t('otp.errorVerification', 'Invalid or expired code. Please try again or resend.'));
    } finally {
      setIsVerifying(false);
    }
  }, [otp, email, navigation, t, setNewUser]);

  const handleResend = useCallback(async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(RESEND_TIMER_SECONDS);
    setOtp(Array(OTP_LENGTH).fill(''));
    setOtpError('');
    inputRefs.current[0]?.focus();

    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await sendOTPEmail(email.trim().toLowerCase());
      Alert.alert(
        t('otp.resentTitle', 'OTP Resent'),
        t('otp.resentMessage', 'A new verification code has been sent to your email.'),
      );
    } catch {
      Alert.alert(t('common.error', 'Error'), t('login.errorSending', 'Failed to resend OTP. Please try again.'));
    }
  }, [canResend, email, t]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const otpFilled = otp.every((digit) => digit !== '');

  return (
    <ScreenWrapper padded={false} scrollable={false} edges={['top', 'bottom']}>
      <Header
        title={t('otp.title', 'Verify Email')}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.heading}>
          {t('otp.heading', 'Enter Verification Code')}
        </Text>
        <Text style={styles.description}>
          {t('otp.description', 'We have sent a 6-digit verification code to')}
        </Text>
        <Text style={styles.emailText}>{email}</Text>

        {/* OTP Input Boxes */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <RNTextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                otpError ? styles.otpBoxError : null,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              editable={!isVerifying}
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Error message */}
        {otpError ? (
          <Text style={styles.errorText}>{otpError}</Text>
        ) : null}

        {/* Verify button */}
        <Button
          title={t('otp.verify', 'Verify')}
          onPress={handleVerify}
          loading={isVerifying}
          disabled={!otpFilled || isVerifying}
          fullWidth
          size="lg"
          style={styles.verifyButton}
        />

        {/* Resend section */}
        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>
                {t('otp.resendCode', 'Resend Code')}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendTimer}>
              {t('otp.resendIn', 'Resend code in')}{' '}
              <Text style={styles.timerText}>{formatTimer(resendTimer)}</Text>
            </Text>
          )}
        </View>

        <Text style={styles.otpHint}>
          {t('otp.codeExpiry', 'Code expires in 10 minutes.')}
        </Text>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: layout.maxContentWidth,
    width: '100%',
    minHeight: 400,
    alignSelf: 'center',
  },
  iconContainer: {
    marginBottom: spacing['3xl'],
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emailText: {
    ...typography.bodySemiBold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  otpBox: {
    flex: 1,
    minWidth: 0,
    maxWidth: 52,
    height: 60,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  otpBoxError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  verifyButton: {
    marginTop: spacing.xl,
    marginBottom: spacing['3xl'],
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  resendLink: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  resendTimer: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  timerText: {
    color: colors.primary,
    fontWeight: '600',
  },
  otpHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  demoHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  demoHintText: {
    ...typography.caption,
    color: colors.textTertiary,
    flex: 1,
  },
});

export default OTPVerificationScreen;
