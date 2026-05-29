import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, ref, set } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { checkIdentifiersAvailability, getCurrentUser } from '../../services/firebase/auth';
import { setPendingRegistration } from '../../services/onboarding/pendingRegistration';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useBusinessConfig } from '../../hooks/useRealtimeData';
import { useDropdownMaxHeight, useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { borderRadius, colors, spacing, typography } from '../../theme';
import type { AuthStackParamList, User } from '../../types';
import { sendPhoneOtpForLinking, verifyPhoneOtpAndLink, getRecaptchaContainerId, resetWebRecaptchaVerifier } from '../../services/firebase/phoneAuth';

type RegisterNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;
type RegisterRouteProp = RouteProp<AuthStackParamList, 'Register'>;

interface RegisterScreenProps {
  navigation: RegisterNavigationProp;
  route: RegisterRouteProp;
}

type FormErrors = {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  companyType?: string;
  companyCategory?: string;
  phone?: string;
  whatsAppNumber?: string;
  businessAddress?: string;
};

type StepKey = 'personal' | 'business' | 'contact' | 'address';

const STEPS: Array<{ key: StepKey; title: string }> = [
  { key: 'personal', title: 'Personal' },
  { key: 'business', title: 'Business' },
  { key: 'contact', title: 'Contact' },
  { key: 'address', title: 'Finish' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COMPANY_TYPE_OPTIONS = ['Private', 'Proprietorship', 'LLP', 'Private Limited', 'NA'] as const;

const PENDING_PHONE_OTP_KEY = 'netconnect_pending_phone_otp_link';
const PENDING_PHONE_OTP_MAX_AGE_MS = 15 * 60 * 1000;
const PHONE_OTP_RESEND_COOLDOWN_SECONDS = 60;
const PHONE_OTP_SEND_TIMEOUT_MS = 25_000;

const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const normalizeTag = (value: string): string => value.trim().replace(/\s+/g, ' ');
const hasTag = (tags: string[], value: string): boolean =>
  tags.some((tag) => tag.toLowerCase() === value.toLowerCase());

const getAuthErrorCode = (err: unknown): string =>
  err && typeof err === 'object' && typeof (err as { code?: unknown }).code === 'string'
    ? (err as { code: string }).code
    : '';

const userMatchesEmail = (user: Record<string, unknown>, normalizedEmail: string): boolean => {
  const candidates = [user.email, user.businessEmail, user.contactEmail];
  return candidates.some((candidate) => normalizeEmail(String(candidate ?? '')) === normalizedEmail);
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const setNewUser = useAuthStore((s) => s.setNewUser);
  const { config: businessConfig } = useBusinessConfig();
  const verifiedEmail = normalizeEmail(route.params?.email ?? getCurrentUser()?.email ?? '');
  const isPhoneOnlyFlow = !verifiedEmail;

  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companyTypeDropdownOpen, setCompanyTypeDropdownOpen] = useState(false);
  const [companyCategory, setCompanyCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [phoneOtpError, setPhoneOtpError] = useState('');
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [phoneOtpSentAtMs, setPhoneOtpSentAtMs] = useState(0);
  const [phoneResendSeconds, setPhoneResendSeconds] = useState(0);
  const [canResendPhoneOtp, setCanResendPhoneOtp] = useState(true);
  const [isWhatsAppSame, setIsWhatsAppSame] = useState(true);
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [googleBusinessProfile, setGoogleBusinessProfile] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const phoneConfirmationRef = useRef<{ verificationId: string } | null>(null);
  const phoneResendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollContentRef = useRef<View | null>(null);
  const categorySectionRef = useRef<View | null>(null);
  const dropdownMaxHeight = useDropdownMaxHeight(180);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    resetWebRecaptchaVerifier();
    return () => {
      resetWebRecaptchaVerifier();
    };
  }, []);

  useEffect(() => {
    const uid = getCurrentUser()?.uid;
    if (!uid) return;
    void setPendingRegistration(uid);
  }, []);

  useEffect(() => {
    let mounted = true;
    const restorePendingPhoneOtp = async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_PHONE_OTP_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { phone10?: string; verificationId?: string; createdAt?: number };
        const phone10 = typeof parsed.phone10 === 'string' ? parsed.phone10.replace(/\D/g, '').slice(0, 10) : '';
        const verificationId = typeof parsed.verificationId === 'string' ? parsed.verificationId : '';
        const createdAt = typeof parsed.createdAt === 'number' ? parsed.createdAt : 0;
        const isFresh = !!createdAt && Date.now() - createdAt <= PENDING_PHONE_OTP_MAX_AGE_MS;

        if (!mounted) return;
        if (!phone10 || !verificationId || !isFresh) {
          await AsyncStorage.removeItem(PENDING_PHONE_OTP_KEY);
          return;
        }

        const currentPhone10 = phone.replace(/\D/g, '').slice(0, 10);
        if (currentPhone10 && currentPhone10 !== phone10) {
          await AsyncStorage.removeItem(PENDING_PHONE_OTP_KEY);
          return;
        }

        if (!currentPhone10) {
          setPhone(phone10);
        }
        phoneConfirmationRef.current = { verificationId };
        setIsPhoneOtpSent(true);
        setIsPhoneVerified(false);
        setPhoneOtpSentAtMs(createdAt);
      } catch {
        // Ignore restore errors; user can resend OTP.
      }
    };

    void restorePendingPhoneOtp();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isPhoneOtpSent || isPhoneVerified || !phoneOtpSentAtMs) {
      setPhoneResendSeconds(0);
      setCanResendPhoneOtp(true);
      if (phoneResendIntervalRef.current) {
        clearInterval(phoneResendIntervalRef.current);
        phoneResendIntervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - phoneOtpSentAtMs) / 1000);
      const remaining = Math.max(0, PHONE_OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      setPhoneResendSeconds(remaining);
      setCanResendPhoneOtp(remaining <= 0);
      if (remaining <= 0 && phoneResendIntervalRef.current) {
        clearInterval(phoneResendIntervalRef.current);
        phoneResendIntervalRef.current = null;
      }
    };

    tick();
    if (phoneResendIntervalRef.current) clearInterval(phoneResendIntervalRef.current);
    phoneResendIntervalRef.current = setInterval(tick, 1000);

    return () => {
      if (phoneResendIntervalRef.current) {
        clearInterval(phoneResendIntervalRef.current);
        phoneResendIntervalRef.current = null;
      }
    };
  }, [isPhoneOtpSent, isPhoneVerified, phoneOtpSentAtMs]);

  useEffect(() => {
    if (!categoryDropdownOpen || currentStep !== 1) return;
    const contentRef = scrollContentRef.current;
    const sectionRef = categorySectionRef.current;
    if (!contentRef || !sectionRef) return;
    const t = setTimeout(() => {
      if (typeof sectionRef.measureLayout === 'function') {
        sectionRef.measureLayout(
          contentRef as unknown as number,
          (_x: number, y: number) => {
            scrollRef.current?.scrollTo({
              y: Math.max(0, y - 100),
              animated: true,
            });
          },
          () => {},
        );
      }
    }, 150);
    return () => clearTimeout(t);
  }, [categoryDropdownOpen, currentStep]);

  const filteredCategories = useMemo(() => {
    const queryText = categorySearch.toLowerCase().trim();
    if (!queryText) return businessConfig.businessCategories;
    return businessConfig.businessCategories.filter((cat) =>
      cat.toLowerCase().includes(queryText),
    );
  }, [businessConfig.businessCategories, categorySearch]);
  const normalizedCategorySearch = normalizeTag(categorySearch);
  const canCreateCategory = !!normalizedCategorySearch
    && !businessConfig.businessCategories.some((cat) => cat.toLowerCase() === normalizedCategorySearch.toLowerCase());

  const clearError = (field: keyof FormErrors) => {
    if (!errors[field]) return;
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const resetPhoneVerification = () => {
    setIsPhoneOtpSent(false);
    setIsPhoneVerified(false);
    setPhoneOtpInput('');
    setPhoneOtpError('');
    phoneConfirmationRef.current = null;
    setPhoneOtpSentAtMs(0);
    setPhoneResendSeconds(0);
    setCanResendPhoneOtp(true);
    if (phoneResendIntervalRef.current) {
      clearInterval(phoneResendIntervalRef.current);
      phoneResendIntervalRef.current = null;
    }
    void AsyncStorage.removeItem(PENDING_PHONE_OTP_KEY);
  };

  const handleSendPhoneOtp = async () => {
    if (isPhoneOtpSent && !canResendPhoneOtp) return;

    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length !== 10) {
      setErrors((prev) => ({
        ...prev,
        phone: t('register.phoneInvalid', 'Enter a valid 10-digit contact number'),
      }));
      return;
    }

    // Clear any previous verification session before sending a new OTP.
    setIsPhoneOtpSent(false);
    setIsPhoneVerified(false);
    setPhoneOtpInput('');
    setPhoneOtpError('');
    phoneConfirmationRef.current = null;
    void AsyncStorage.removeItem(PENDING_PHONE_OTP_KEY);

    setIsSendingPhoneOtp(true);
    setPhoneOtpError('');
    clearError('phone');
    phoneConfirmationRef.current = null;
    try {
      const e164 = `+91${normalizedPhone}`;
      const uid = getCurrentUser()?.uid;
      if (uid) {
        try {
          const { phoneInUse } = await checkIdentifiersAvailability({ phone: e164, excludeUid: uid });
          if (phoneInUse) {
            Alert.alert(
              t('register.phoneInUseTitle', 'Number already in use'),
              t('register.phoneInUseMessage', 'This mobile number is already registered. Please login instead.'),
            );
            return;
          }
        } catch {
          // If checks fail (e.g. offline), continue and let linking fail with a clear error message.
        }
      }
      const verifier = Platform.OS === 'web' ? undefined : undefined;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const confirmationResult = await Promise.race([
        sendPhoneOtpForLinking(e164, verifier),
        new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('OTP request timed out. Please try again.')), PHONE_OTP_SEND_TIMEOUT_MS);
        }),
      ]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
      if (confirmationResult && 'verificationId' in confirmationResult) {
        phoneConfirmationRef.current = { verificationId: confirmationResult.verificationId };
        setIsPhoneOtpSent(true);
        setIsPhoneVerified(false);
        setPhoneOtpInput('');
        setPhoneOtpSentAtMs(Date.now());
        void AsyncStorage.setItem(
          PENDING_PHONE_OTP_KEY,
          JSON.stringify({ phone10: normalizedPhone, verificationId: confirmationResult.verificationId, createdAt: Date.now() }),
        );
        Alert.alert(
          t('register.otpSentTitle', 'OTP Sent'),
          t('register.otpSentToPhone', 'A verification code has been sent to {{phone}}', {
            phone: normalizedPhone,
          }),
        );
      } else {
        Alert.alert(
          t('common.error', 'Error'),
          t('register.phoneOtpFailed', 'Could not send SMS. Please try again.'),
        );
      }
    } catch (err: unknown) {
      const message = err && typeof (err as { message?: string }).message === 'string' ? (err as { message: string }).message : '';
      Alert.alert(
        t('common.error', 'Error'),
        t('register.phoneOtpFailed', 'Could not send SMS. Please check the number and try again.') + (message ? ` ${message}` : ''),
      );
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    const normalizedOtp = phoneOtpInput.replace(/\D/g, '');
    const verificationId = phoneConfirmationRef.current?.verificationId;
    if (!verificationId) {
      setPhoneOtpError(t('register.errorVerifyOtp', 'Please send the code first.'));
      return;
    }
    if (normalizedOtp.length !== 6) {
      setPhoneOtpError(t('register.errorVerifyOtp6', 'Enter the 6-digit code from SMS.'));
      return;
    }

    setIsVerifyingPhoneOtp(true);
    setPhoneOtpError('');
    try {
      await verifyPhoneOtpAndLink(verificationId, normalizedOtp);
      setIsPhoneVerified(true);
      phoneConfirmationRef.current = null;
      void AsyncStorage.removeItem(PENDING_PHONE_OTP_KEY);
      clearError('phone');
      Alert.alert(
        t('register.verified', 'Verified'),
        t('register.businessNumber', 'Business Number'),
      );
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      const message =
        err && typeof (err as { message?: unknown }).message === 'string'
          ? (err as { message: string }).message
          : '';

      // Safe fallback in case Firebase reports the user already has a phone provider.
      if (code === 'auth/provider-already-linked' || message.toLowerCase().includes('already been linked')) {
        setIsPhoneVerified(true);
        phoneConfirmationRef.current = null;
        void AsyncStorage.removeItem(PENDING_PHONE_OTP_KEY);
        clearError('phone');
        return;
      }
      if (
        code === 'auth/credential-already-in-use'
        || code === 'auth/phone-number-already-exists'
        || code === 'auth/account-exists-with-different-credential'
      ) {
        setPhoneOtpError(t('register.phoneInUseMessage', 'This mobile number is already registered. Please login instead.'));
        return;
      }
      if (
        code === 'auth/invalid-verification-code'
        || code === 'auth/invalid-verification-id'
        || code === 'auth/session-expired'
      ) {
        setPhoneOtpError(t('otp.errorVerification', 'Invalid or expired code. Please try again or resend.'));
        return;
      }
      setPhoneOtpError(t('register.errorVerifyOtp', 'Invalid code. Please try again.'));
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleSelectCompanyType = (value: string) => {
    setCompanyType(value);
    setCompanyTypeDropdownOpen(false);
    clearError('companyType');
  };

  const handleClearCompanyType = () => {
    setCompanyType('');
    setCompanyTypeDropdownOpen(false);
  };

  const handleSelectCategory = (category: string) => {
    setCompanyCategory(category);
    setCategorySearch(category);
    setCategoryDropdownOpen(false);
    clearError('companyCategory');
  };

  const handleClearCategory = () => {
    setCompanyCategory('');
    setCategorySearch('');
    setCategoryDropdownOpen(false);
  };

  const validateStep = (stepIndex: number): boolean => {
    const nextErrors: FormErrors = {};
    const normalizedPhone = phone.replace(/\D/g, '');
    const normalizedWhatsApp = whatsAppNumber.replace(/\D/g, '');

    if (stepIndex === 0) {
      if (!firstName.trim()) nextErrors.firstName = t('register.firstNameRequired', 'First name is required');
      if (!lastName.trim()) nextErrors.lastName = t('register.lastNameRequired', 'Last name is required');
    }

    if (stepIndex === 1) {
      if (!businessName.trim()) nextErrors.businessName = t('register.businessNameRequired', 'Business name is required');
      if (!companyType.trim()) nextErrors.companyType = t('register.businessCategoryRequired', 'Company type is required');
      if (!companyCategory.trim()) nextErrors.companyCategory = t('register.companyCategoryRequired', 'Company category is required');
    }

    if (stepIndex === 2) {
      if (!normalizedPhone) {
        nextErrors.phone = t('register.phoneRequired', 'Business number is required');
      } else if (normalizedPhone.length !== 10) {
        nextErrors.phone = t('register.phoneInvalid', 'Enter a valid 10-digit contact number');
      } else if (!isPhoneVerified) {
        nextErrors.phone = t('register.phoneNotVerified', 'Please verify your business number');
      }

      if (!isWhatsAppSame) {
        if (!normalizedWhatsApp) {
          nextErrors.whatsAppNumber = t('register.whatsappRequired', 'WhatsApp number is required');
        } else if (normalizedWhatsApp.length !== 10) {
          nextErrors.whatsAppNumber = t('register.whatsappInvalid', 'Enter a valid 10-digit WhatsApp number');
        }
      }
    }

    if (stepIndex === 3) {
      if (!businessAddress.trim()) {
        nextErrors.businessAddress = t('register.addressRequired', 'Business address is required');
      }

      if (!isPhoneOnlyFlow && !EMAIL_REGEX.test(verifiedEmail)) {
        Alert.alert(
          t('common.error', 'Error'),
          t('register.invalidEmail', 'Invalid verified email. Please login again.'),
        );
        return false;
      }
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = (): boolean => {
    const ok0 = validateStep(0);
    const ok1 = validateStep(1);
    const ok2 = validateStep(2);
    const ok3 = validateStep(3);
    return ok0 && ok1 && ok2 && ok3;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCreateAccount = async () => {
    if (!validateAll()) return;
    const uid = getCurrentUser()?.uid;
    if (!uid) {
      Alert.alert(
        t('common.error', 'Error'),
        t('register.sessionExpired', 'Session expired. Please sign in again.'),
      );
      return;
    }
    setIsSubmitting(true);

    try {
      const finalEmail = verifiedEmail || getCurrentUser()?.email || '';
      if (!isPhoneOnlyFlow) {
        const usersRef = ref(rtdb, 'users');
        const usersSnap = await get(usersRef);
        const existingByEmail = usersSnap.exists()
          ? Object.entries(usersSnap.val() as Record<string, Record<string, unknown>>).find(([, user]) =>
              userMatchesEmail(user, verifiedEmail),
            )?.[0]
          : undefined;

        if (existingByEmail && existingByEmail !== uid) {
          await AsyncStorage.setItem('netconnect_signin_email', verifiedEmail);
          setNewUser(false);
          navigation.reset({ index: 0, routes: [{ name: 'BiometricSetup' }] });
          return;
        }
      }

      const now = new Date().toISOString();
      const fullName = `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim();
      const normalizedPhone = phone.replace(/\D/g, '');
      const normalizedWhatsApp = isWhatsAppSame
        ? normalizedPhone
        : whatsAppNumber.replace(/\D/g, '');

      // Final safety check: prevent duplicate phone/email across Auth + RTDB.
      try {
        const e164 = `+91${normalizedPhone}`;
        const { phoneInUse, emailInUse } = await checkIdentifiersAvailability({ email: finalEmail, phone: e164, excludeUid: uid });
        if (phoneInUse) {
          Alert.alert(
            t('register.phoneInUseTitle', 'Number already in use'),
            t('register.phoneInUseMessage', 'This mobile number is already registered. Please login instead.'),
          );
          return;
        }
        if (emailInUse && !isPhoneOnlyFlow) {
          Alert.alert(
            t('register.emailInUseTitle', 'Email already in use'),
            t('register.emailInUseMessage', 'This email is already registered. Please login instead.'),
          );
          return;
        }
      } catch {
        // ignore; we still try to create the RTDB profile (Auth linking will prevent duplicates at provider level).
      }

      const userRecord: User = {
        uid,
        email: finalEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: fullName,
        phone: normalizedPhone,
        photoURL: '',
        businessName: businessName.trim(),
        businessDescription: '',
        companyType: companyType.trim(),
        businessCategory: companyCategory.trim(),
        businessTags: [],
        businessPhotos: [],
        services: [],
        businessAddress: businessAddress.trim(),
        isWhatsAppSame,
        socialLinks: {
          instagram: '',
          facebook: '',
          whatsapp: normalizedWhatsApp,
          linkedin: linkedIn.trim(),
          google: googleBusinessProfile.trim(),
        },
        chapterId: '',
        zoneId: '',
        location: { city: '', state: '' },
        dateOfBirth: '',
        language: 'en',
        biometricEnabled: false,
        role: 'member',
        leadershipRole: 'member',
        leadershipRolePoints: 0,
        leadershipRoleCity: '',
        // New registrations require admin approval.
        isActive: false,
        profileComplete: true,
        createdAt: now,
        updatedAt: now,
      };

      await set(ref(rtdb, 'users/' + uid), userRecord);
      if (finalEmail) await AsyncStorage.setItem('netconnect_signin_email', finalEmail);
      setNewUser(false);
      navigation.reset({ index: 0, routes: [{ name: 'BiometricSetup' }] });
    } catch {
      Alert.alert(
        t('common.error', 'Error'),
        t('register.createFailed', 'Unable to create account right now. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <>
          <Text style={styles.sectionTitle}>{t('register.personalInfo', 'Personal Information')}</Text>
          <TextInput
            label={t('register.firstName', 'First Name')}
            placeholder={t('register.firstNamePlaceholder', 'First name')}
            value={firstName}
            onChangeText={(value) => {
              setFirstName(value);
              clearError('firstName');
            }}
            error={errors.firstName}
            icon="person-outline"
            autoCapitalize="words"
          />
          <TextInput
            label={t('register.lastName', 'Last Name')}
            placeholder={t('register.lastNamePlaceholder', 'Last name')}
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              clearError('lastName');
            }}
            error={errors.lastName}
            icon="person-outline"
            autoCapitalize="words"
          />
        </>
      );
    }

    if (currentStep === 1) {
      return (
        <>
          <Text style={styles.sectionTitle}>{t('register.businessInfo', 'Business Information')}</Text>
          <TextInput
            label={t('register.businessName', 'Business Name')}
            placeholder={t('register.businessNamePlaceholder', 'Enter your business name')}
            value={businessName}
            onChangeText={(value) => {
              setBusinessName(value);
              clearError('businessName');
            }}
            error={errors.businessName}
            icon="business-outline"
          />

          <Text style={styles.inputLabel}>{t('register.companyType', 'Company Type')}</Text>
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={[
                styles.dropdownInputRow,
                companyTypeDropdownOpen && styles.dropdownInputRowFocused,
                errors.companyType && styles.dropdownInputRowError,
              ]}
              onPress={() => setCompanyTypeDropdownOpen((open) => !open)}
              activeOpacity={0.7}
            >
              <Ionicons name="business-outline" size={18} color={colors.textTertiary} />
              <Text style={[styles.dropdownSearchInput, !companyType && { color: colors.textTertiary }]}>
                {companyType || t('register.companyTypePlaceholder', 'Select company type')}
              </Text>
              {companyType ? (
                <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleClearCompanyType(); }}>
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
              )}
            </TouchableOpacity>

            {companyTypeDropdownOpen ? (
              <ScrollView
                style={[styles.dropdownList, { maxHeight: dropdownMaxHeight }]}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {COMPANY_TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectCompanyType(option)}
                  >
                    <Text style={styles.dropdownItemText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {errors.companyType ? <Text style={styles.errorText}>{errors.companyType}</Text> : null}
          </View>

          <Text style={styles.inputLabel}>{t('register.companyCategory', 'Company Category')}</Text>
          <View ref={categorySectionRef} style={styles.dropdownWrapper} collapsable={false}>
            <View
              style={[
                styles.dropdownInputRow,
                categoryDropdownOpen && styles.dropdownInputRowFocused,
                errors.companyCategory && styles.dropdownInputRowError,
              ]}
            >
              <Ionicons name="grid-outline" size={18} color={colors.textTertiary} />
              <RNTextInput
                style={styles.dropdownSearchInput}
                value={companyCategory || categorySearch}
                onChangeText={(text) => {
                  if (!companyCategory) {
                    setCategorySearch(text);
                    setCategoryDropdownOpen(true);
                  }
                }}
                onFocus={() => {
                  if (!companyCategory) setCategoryDropdownOpen(true);
                }}
                onBlur={() => {
                  setTimeout(() => setCategoryDropdownOpen(false), Platform.OS === 'android' ? 300 : 180);
                }}
                placeholder={t('register.companyCategoryPlaceholder', 'Select company category')}
                placeholderTextColor={colors.textTertiary}
                editable={!companyCategory}
              />
              {companyCategory ? (
                <TouchableOpacity onPress={handleClearCategory}>
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
              )}
            </View>

            {categoryDropdownOpen && !companyCategory && (filteredCategories.length > 0 || canCreateCategory) ? (
              <ScrollView
                style={[styles.dropdownList, { maxHeight: dropdownMaxHeight }]}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {canCreateCategory ? (
                  <TouchableOpacity style={styles.serviceCreateItem} onPress={() => handleSelectCategory(normalizedCategorySearch)}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.serviceCreateText}>
                      {t('register.createCategoryTag', 'Create "{{category}}"', { category: normalizedCategorySearch })}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {filteredCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectCategory(cat)}
                  >
                    <Text style={styles.dropdownItemText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {errors.companyCategory ? <Text style={styles.errorText}>{errors.companyCategory}</Text> : null}
          </View>
        </>
      );
    }

    if (currentStep === 2) {
      return (
        <>
          <Text style={styles.sectionTitle}>{t('register.contactVerification', 'Contact Verification')}</Text>
          <TextInput
            label={t('register.businessEmail', 'Business Email')}
            value={verifiedEmail}
            editable={false}
            icon="mail-outline"
          />
          <TextInput
            label={t('register.businessNumber', 'Business Number')}
            placeholder={t('register.businessNumberPlaceholder', '9876543210')}
            value={phone}
            onChangeText={(value) => {
              const sanitized = value.replace(/\D/g, '').slice(0, 10);
              if (sanitized !== phone) {
                setPhone(sanitized);
                resetPhoneVerification();
              }
              clearError('phone');
            }}
            error={errors.phone}
            icon="call-outline"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <View style={styles.phoneVerifyContainer}>
            {isPhoneVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.verifiedBadgeText}>{t('register.verified', 'Verified')}</Text>
              </View>
            ) : (
              <Button
                title={
                  isPhoneOtpSent
                    ? (canResendPhoneOtp
                      ? t('register.resendOtp', 'Resend OTP')
                      : t('auth.resendIn', 'Resend in {{seconds}}s', { seconds: phoneResendSeconds }))
                    : t('register.sendOtp', 'Send OTP')
                }
                onPress={handleSendPhoneOtp}
                loading={isSendingPhoneOtp}
                disabled={isSendingPhoneOtp || phone.replace(/\D/g, '').length !== 10 || (isPhoneOtpSent && !canResendPhoneOtp)}
                size="sm"
              />
            )}
          </View>

          {isPhoneOtpSent && !isPhoneVerified ? (
            <View style={styles.phoneOtpContainer}>
              <TextInput
                label={t('register.enterOtp', 'Enter verification code')}
                placeholder={t('register.otpPlaceholderSms', '6-digit code from SMS')}
                value={phoneOtpInput}
                onChangeText={(value) => {
                  setPhoneOtpInput(value.replace(/\D/g, '').slice(0, 6));
                  if (phoneOtpError) setPhoneOtpError('');
                }}
                icon="shield-checkmark-outline"
                keyboardType="number-pad"
                maxLength={6}
                error={phoneOtpError || undefined}
              />
              <Button
                title={t('register.verify', 'Verify')}
                onPress={handleVerifyPhoneOtp}
                loading={isVerifyingPhoneOtp}
                disabled={isVerifyingPhoneOtp || phoneOtpInput.length !== 6}
                size="sm"
              />
              <Text style={styles.phoneOtpHint}>
                {t('register.smsCodeHint', 'Enter the 6-digit code sent to your phone via SMS.')}
              </Text>
            </View>
          ) : null}
          {Platform.OS === 'web' ? (
            <View nativeID={getRecaptchaContainerId()} style={styles.recaptchaPlaceholder} />
          ) : null}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {t('register.whatsappSame', 'Is this your WhatsApp number?')}
            </Text>
            <Switch
              value={isWhatsAppSame}
              onValueChange={(value) => {
                setIsWhatsAppSame(value);
                if (value) setWhatsAppNumber('');
                clearError('whatsAppNumber');
              }}
              trackColor={{ false: colors.border, true: colors.primaryFaded }}
              thumbColor={isWhatsAppSame ? colors.primary : colors.textTertiary}
            />
          </View>
          {!isWhatsAppSame ? (
            <TextInput
              label={t('register.whatsappNumber', 'WhatsApp Number')}
              placeholder={t('register.whatsappNumberPlaceholder', '9876543210')}
              value={whatsAppNumber}
              onChangeText={(value) => {
                setWhatsAppNumber(value.replace(/\D/g, '').slice(0, 10));
                clearError('whatsAppNumber');
              }}
              error={errors.whatsAppNumber}
              icon="logo-whatsapp"
              keyboardType="phone-pad"
              maxLength={10}
            />
          ) : null}
        </>
      );
    }

    return (
      <>
        <Text style={styles.sectionTitle}>{t('register.addressLinks', 'Address & Links')}</Text>
        <TextInput
          label={t('register.businessAddress', 'Business Address')}
          placeholder={t('register.businessAddressPlaceholder', 'Enter your business address')}
          value={businessAddress}
          onChangeText={(value) => {
            setBusinessAddress(value);
            clearError('businessAddress');
          }}
          error={errors.businessAddress}
          icon="location-outline"
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />
        <TextInput
          label={t('register.googleBusinessProfile', 'Google Business Profile')}
          placeholder={t('register.googleBusinessProfilePlaceholder', 'Google Business URL (optional)')}
          value={googleBusinessProfile}
          onChangeText={setGoogleBusinessProfile}
          icon="globe-outline"
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextInput
          label={t('register.linkedin', 'LinkedIn')}
          placeholder={t('register.linkedinPlaceholder', 'LinkedIn profile URL (optional)')}
          value={linkedIn}
          onChangeText={setLinkedIn}
          icon="logo-linkedin"
          autoCapitalize="none"
          keyboardType="url"
        />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardHeight > 0 && { paddingBottom: spacing['4xl'] + keyboardHeight },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={categoryDropdownOpen ? 'none' : 'on-drag'}
        >
        <View ref={scrollContentRef} style={styles.container} collapsable={false}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{t('register.title', 'Create Account')}</Text>
          </View>

          <View style={styles.timelineWrap}>
            <View style={styles.timelineDotsRow}>
              {STEPS.map((step, index) => {
                const isDone = index < currentStep;
                const isActive = index === currentStep;
                return (
                  <View key={`${step.key}-dot`} style={styles.timelineDotItem}>
                    <View
                      style={[
                        styles.stepDot,
                        isDone && styles.stepDotDone,
                        isActive && styles.stepDotActive,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                      ) : (
                        <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    {index < STEPS.length - 1 ? (
                      <View style={[styles.stepLine, index < currentStep && styles.stepLineDone]} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          <View style={styles.timelineLabelsRow}>
            {STEPS.map((step, index) => (
              <View key={`${step.key}-label`} style={styles.timelineLabelItem}>
                <Text
                  style={[styles.stepLabel, index === currentStep && styles.stepLabelActive]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </View>
            ))}
          </View>
          </View>

          <View style={styles.card}>
            {renderStepContent()}
          </View>

          <View style={styles.actions}>
            {currentStep < STEPS.length - 1 ? (
              <Button
                title={t('common.next', 'Next')}
                onPress={handleNext}
                fullWidth
                icon="arrow-forward"
                iconPosition="right"
              />
            ) : (
              <Button
                title={t('register.createAccount', 'Create Account')}
                onPress={handleCreateAccount}
                loading={isSubmitting}
                disabled={isSubmitting}
                fullWidth
                icon="person-add-outline"
                iconPosition="right"
              />
            )}
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing['4xl'],
  },
  container: {
    flexGrow: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 760,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  timelineWrap: {
    marginBottom: spacing.lg,
  },
  timelineDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timelineDotItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineLabelsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  timelineLabelItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  stepDotDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  stepNumber: {
    ...typography.captionMedium,
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.primary,
  },
  stepLabel: {
    ...typography.captionMedium,
    color: colors.textTertiary,
  },
  stepLabelActive: {
    color: colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepLineDone: {
    backgroundColor: colors.primary,
  },
  card: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dropdownWrapper: {
    marginBottom: spacing.lg,
  },
  dropdownInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    gap: spacing.sm,
  },
  dropdownInputRowFocused: {
    borderColor: colors.primary,
  },
  dropdownInputRowError: {
    borderColor: colors.error,
  },
  dropdownInputRowDisabled: {
    opacity: 0.75,
  },
  dropdownSearchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    padding: 0,
    margin: 0,
  },
  dropdownList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    maxHeight: 180,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  selectedServicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  selectedServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primaryFaded,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  selectedServiceChipText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  serviceCreateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  serviceCreateText: {
    ...typography.bodySmallMedium,
    color: colors.primary,
  },
  emptyDropdownText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  switchLabel: {
    ...typography.bodySmallMedium,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  phoneVerifyContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  phoneOtpContainer: {
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  phoneOtpHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  phoneWebOnlyHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  recaptchaPlaceholder: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.successLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  verifiedBadgeText: {
    ...typography.captionMedium,
    color: colors.success,
  },
  multiline: {
    height: 84,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: spacing.lg,
  },
});

export default RegisterScreen;
