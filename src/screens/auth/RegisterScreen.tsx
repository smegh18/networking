import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
import { checkIdentifiersAvailability, getCurrentUser, sendOTPEmail, verifyEmailOtpAndAttach } from '../../services/firebase/auth';
import { setPendingRegistration } from '../../services/onboarding/pendingRegistration';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useBusinessConfig, useRealtimeCollection } from '../../hooks/useRealtimeData';
import { useDropdownMaxHeight, useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { borderRadius, colors, spacing, typography } from '../../theme';
import type { AuthStackParamList, Chapter, User } from '../../types';
import { DEFAULT_CHAPTER_ID, DEFAULT_CHAPTER_NAME, getUserChapterId } from '../../utils/chapter';
import { normalizeStringArray, normalizeTextLower } from '../../utils/helpers';

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
  email?: string;
  phone?: string;
  whatsAppNumber?: string;
  businessAddress?: string;
  chapterId?: string;
  city?: string;
  state?: string;
  pinCode?: string;
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
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
  const initialEmail = normalizeEmail(route.params?.email ?? getCurrentUser()?.email ?? '');
  const initialPhone = (route.params?.phone ?? getCurrentUser()?.phoneNumber ?? '').replace(/\D/g, '').slice(-10);

  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companyTypeDropdownOpen, setCompanyTypeDropdownOpen] = useState(false);
  const [companyCategory, setCompanyCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(!!initialEmail);
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [emailOtpError, setEmailOtpError] = useState('');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [isPhoneVerified, setIsPhoneVerified] = useState(!!initialPhone);
  const [isWhatsAppSame, setIsWhatsAppSame] = useState(true);
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessArea, setBusinessArea] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('');
  const [businessPinCode, setBusinessPinCode] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [chapterSearch, setChapterSearch] = useState('');
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areaSearch, setAreaSearch] = useState('');
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [googleBusinessProfile, setGoogleBusinessProfile] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollContentRef = useRef<View | null>(null);
  const categorySectionRef = useRef<View | null>(null);
  const dropdownMaxHeight = useDropdownMaxHeight(180);
  const keyboardHeight = useKeyboardHeight();
  const businessCategories = useMemo(
    () => normalizeStringArray(businessConfig.businessCategories),
    [businessConfig.businessCategories],
  );

  useEffect(() => {
    const uid = getCurrentUser()?.uid;
    if (!uid) return;
    void setPendingRegistration(uid);
  }, []);

  // Load areas data (mock data for now - replace with real service call)
  useEffect(() => {
    const loadAreas = async () => {
      try {
        setAreasLoading(true);
        // Mock data - in a real app, this would come from a service
        const mockAreas = [
          { id: 'area001', name: 'Connaught Place' },
          { id: 'area002', name: 'Karol Bagh' },
          { id: 'area003', name: 'Lajpat Nagar' },
          { id: 'area004', name: 'Dwarka' },
          { id: 'area005', name: 'Rohini' },
          { id: 'area006', name: 'Pitampura' },
          { id: 'area007', name: 'Janakpuri' },
          { id: 'area008', name: 'Vasant Kunj' },
          { id: 'area009', name: 'Saket' },
          { id: 'area010', name: 'Greater Kailash' },
          { id: 'area011', name: 'Defence Colony' },
          { id: 'area012', name: 'Green Park' },
          { id: 'area013', name: 'Hauz Khas' },
          { id: 'area014', name: 'Malviya Nagar' },
          { id: 'area015', name: 'Nehru Place' },
          { id: 'area016', name: 'Lodi Colony' },
          { id: 'area017', name: 'Khan Market' },
          { id: 'area018', name: 'Ctrl' },
          { id: 'area019', name: 'Gurgaon' },
          { id: 'area020', name: 'Noida' }
        ];
        setAreas(mockAreas);
      } catch (err) {
        console.error('Failed to load areas:', err);
      } finally {
        setAreasLoading(false);
      }
    };
    loadAreas();
  }, []);

  useEffect(() => {
    void AsyncStorage.removeItem(PENDING_PHONE_OTP_KEY);
  }, []);

  useEffect(() => {
    const authPhone = getCurrentUser()?.phoneNumber?.replace(/\D/g, '').slice(-10) || '';
    const nextPhone = initialPhone || authPhone;
    if (!nextPhone) return;
    setPhone(nextPhone);
    setIsPhoneVerified(true);
  }, [initialPhone]);

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
    const queryText = normalizeTextLower(categorySearch);
    if (!queryText) return businessCategories;
    return businessCategories.filter((cat) =>
      normalizeTextLower(cat).includes(queryText),
    );
  }, [businessCategories, categorySearch]);
  const normalizedCategorySearch = normalizeTag(categorySearch);
  const canCreateCategory = !!normalizedCategorySearch
    && !businessCategories.some((cat) => normalizeTextLower(cat) === normalizeTextLower(normalizedCategorySearch));
  const chapterOptions = useMemo<Chapter[]>(
    () =>
      chapters.length > 0
        ? chapters
        : [{
            id: DEFAULT_CHAPTER_ID,
            name: DEFAULT_CHAPTER_NAME,
            location: { city: '', state: '' },
            memberCount: 0,
            createdAt: '',
          }],
    [chapters],
  );
  const filteredChapters = useMemo(() => {
    const queryText = normalizeTextLower(chapterSearch);
    if (!queryText || chapterId) return chapterOptions;
    return chapterOptions.filter((chapter) => {
      const haystack = [
        chapter.name,
        chapter.id,
        chapter.location?.city,
        chapter.location?.state,
      ].filter(Boolean).join(' ');
      return normalizeTextLower(haystack).includes(queryText);
    });
  }, [chapterId, chapterOptions, chapterSearch]);

  const clearError = (field: keyof FormErrors) => {
    if (!errors[field]) return;
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const resetEmailVerification = () => {
    setIsEmailOtpSent(false);
    setIsEmailVerified(false);
    setEmailOtpInput('');
    setEmailOtpError('');
  };

  const handleSendEmailOtp = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrors((prev) => ({ ...prev, email: t('login.errorInvalid', 'Please enter a valid email address') }));
      return;
    }

    setIsSendingEmailOtp(true);
    setEmailOtpError('');
    clearError('email');
    try {
      const uid = getCurrentUser()?.uid;
      if (uid) {
        const { emailInUse } = await checkIdentifiersAvailability({ email: normalizedEmail, excludeUid: uid });
        if (emailInUse) {
          setEmailOtpError(t('register.emailInUseMessage', 'This email is already registered. Please login instead.'));
          return;
        }
      }
      await sendOTPEmail(normalizedEmail);
      setIsEmailOtpSent(true);
      setEmailOtpInput('');
      Alert.alert(
        t('otp.resentTitle', 'OTP Sent'),
        t('otp.resentMessage', 'A new verification code has been sent to your email.'),
      );
    } catch (err: unknown) {
      const message = err && typeof (err as { message?: string }).message === 'string'
        ? (err as { message: string }).message
        : t('login.errorSending', 'Failed to send OTP. Please try again.');
      setEmailOtpError(message);
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedOtp = emailOtpInput.replace(/\D/g, '');
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailOtpError(t('login.errorInvalid', 'Please enter a valid email address'));
      return;
    }
    if (normalizedOtp.length !== 6) {
      setEmailOtpError(t('register.errorVerifyOtp6', 'Enter the 6-digit code from SMS.'));
      return;
    }

    setIsVerifyingEmailOtp(true);
    setEmailOtpError('');
    try {
      const attachedEmail = await verifyEmailOtpAndAttach(normalizedEmail, normalizedOtp);
      setEmail(attachedEmail);
      setIsEmailVerified(true);
      setIsEmailOtpSent(false);
      setEmailOtpInput('');
      clearError('email');
      Alert.alert(
        t('register.verified', 'Verified'),
        t('register.businessEmail', 'Business Email'),
      );
    } catch (err: unknown) {
      const code = getAuthErrorCode(err);
      const message = err && typeof (err as { message?: string }).message === 'string'
        ? (err as { message: string }).message
        : t('otp.errorVerification', 'Invalid or expired code. Please try again or resend.');
      if (code === 'functions/already-exists' || code === 'already-exists') {
        setEmailOtpError(t('register.emailInUseMessage', 'This email is already registered. Please login instead.'));
        return;
      }
      setEmailOtpError(message);
    } finally {
      setIsVerifyingEmailOtp(false);
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

  const handleSelectChapter = (chapter: Chapter) => {
    setChapterId(chapter.id);
    setChapterSearch(chapter.name);
    setChapterDropdownOpen(false);
    clearError('chapterId');
  };

  const handleClearChapter = () => {
    setChapterId('');
    setChapterSearch('');
    setChapterDropdownOpen(false);
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

      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        nextErrors.email = t('login.errorRequired', 'Email address is required');
      } else if (!EMAIL_REGEX.test(normalizedEmail)) {
        nextErrors.email = t('login.errorInvalid', 'Please enter a valid email address');
      } else if (!isEmailVerified) {
        nextErrors.email = t('register.emailNotVerified', 'Please verify your business email');
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
      if (!chapterId.trim()) {
        nextErrors.chapterId = t('register.chapterRequired', 'Chapter is required');
      }
      if (!businessAddress.trim()) {
        nextErrors.businessAddress = t('register.addressRequired', 'Business address is required');
      }
      if (!businessCity.trim()) {
        nextErrors.city = t('register.cityRequired', 'City is required');
      }
      if (!businessState.trim()) {
        nextErrors.state = t('register.stateRequired', 'State is required');
      }
      if (!businessPinCode.trim()) {
        nextErrors.pinCode = t('register.pinCodeRequired', 'PIN code is required');
      } else if (!/^\d{6}$/.test(businessPinCode.trim())) {
        nextErrors.pinCode = t('register.pinCodeInvalid', 'Enter a valid 6-digit PIN code');
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
      const finalEmail = normalizeEmail(email);
      if (!EMAIL_REGEX.test(finalEmail) || !isEmailVerified) {
        Alert.alert(
          t('common.error', 'Error'),
          t('register.emailNotVerified', 'Please verify your business email'),
        );
        return;
      }
      {
        const usersRef = ref(rtdb, 'users');
        const usersSnap = await get(usersRef);
        const existingByEmail = usersSnap.exists()
          ? Object.entries(usersSnap.val() as Record<string, Record<string, unknown>>).find(([, user]) =>
              userMatchesEmail(user, finalEmail),
            )?.[0]
          : undefined;

        if (existingByEmail && existingByEmail !== uid) {
          await AsyncStorage.setItem('netconnect_signin_email', finalEmail);
          setNewUser(false);
          navigation.reset({ index: 0, routes: [{ name: 'BiometricSetup' }] });
          return;
        }
      }

      const now = new Date().toISOString();
      const fullName = `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim();
      const normalizedPhone = phone.replace(/\D/g, '');
      const normalizedPinCode = businessPinCode.trim();
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
        if (emailInUse) {
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
        businessArea: businessArea.trim(),
        isWhatsAppSame,
        socialLinks: {
          instagram: '',
          facebook: '',
          whatsapp: normalizedWhatsApp,
          linkedin: linkedIn.trim(),
          google: googleBusinessProfile.trim(),
        },
        chapterId: getUserChapterId(chapterId),
        location: {
          city: businessCity.trim(),
          state: businessState.trim(),
          area: businessArea.trim(),
          pinCode: normalizedPinCode,
          placeId: businessPlaceId,
          ...(typeof businessLatitude === 'number' ? { latitude: businessLatitude } : {}),
          ...(typeof businessLongitude === 'number' ? { longitude: businessLongitude } : {}),
        },
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

  // Lookup city and state from PIN code
  const lookupCityStateFromPinCode = (pinCode: string): { city: string; state: string } | null => {
    // Remove any non-digit characters and take first 6 digits
    const cleanPinCode = pinCode.replace(/\D/g, '').slice(0, 6);

    // If not a 6-digit PIN code, return null
    if (cleanPinCode.length !== 6 || !/^\d{6}$/.test(cleanPinCode)) {
      return null;
    }

    // Mock PIN code to city/state mapping (in a real app, this would come from a service)
    const pinCodeMap: Record<string, { city: string; state: string }> = {
      // Delhi
      '110001': { city: 'New Delhi', state: 'Delhi' },
      '110002': { city: 'New Delhi', state: 'Delhi' },
      '110003': { city: 'New Delhi', state: 'Delhi' },
      '110004': { city: 'New Delhi', state: 'Delhi' },
      '110005': { city: 'New Delhi', state: 'Delhi' },
      '110006': { city: 'New Delhi', state: 'Delhi' },
      '110007': { city: 'New Delhi', state: 'Delhi' },
      '110008': { city: 'New Delhi', state: 'Delhi' },
      '110009': { city: 'New Delhi', state: 'Delhi' },
      '110010': { city: 'New Delhi', state: 'Delhi' },
      '110011': { city: 'Delhi', state: 'Delhi' },
      '110012': { city: 'Delhi', state: 'Delhi' },
      '110013': { city: 'Delhi', state: 'Delhi' },
      '110014': { city: 'Delhi', state: 'Delhi' },
      '110015': { city: 'Delhi', state: 'Delhi' },
      '110016': { city: 'Delhi', state: 'Delhi' },
      '110017': { city: 'Delhi', state: 'Delhi' },
      '110018': { city: 'Delhi', state: 'Delhi' },
      '110019': { city: 'Delhi', state: 'Delhi' },
      '110020': { city: 'Delhi', state: 'Delhi' },

      // Mumbai
      '400001': { city: 'Mumbai', state: 'Maharashtra' },
      '400002': { city: 'Mumbai', state: 'Maharashtra' },
      '400003': { city: 'Mumbai', state: 'Maharashtra' },
      '400004': { city: 'Mumbai', state: 'Maharashtra' },
      '400005': { city: 'Mumbai', state: 'Maharashtra' },
      '400006': { city: 'Mumbai', state: 'Maharashtra' },
      '400007': { city: 'Mumbai', state: 'Maharashtra' },
      '400008': { city: 'Mumbai', state: 'Maharashtra' },
      '400009': { city: 'Mumbai', state: 'Maharashtra' },
      '400010': { city: 'Mumbai', state: 'Maharashtra' },

      // Bangalore
      '560001': { city: 'Bangalore', state: 'Karnataka' },
      '560002': { city: 'Bangalore', state: 'Karnataka' },
      '560003': { city: 'Bangalore', state: 'Karnataka' },
      '560004': { city: 'Bangalore', state: 'Karnataka' },
      '560005': { city: 'Bangalore', state: 'Karnataka' },
      '560006': { city: 'Bangalore', state: 'Karnataka' },
      '560007': { city: 'Bangalore', state: 'Karnataka' },
      '560008': { city: 'Bangalore', state: 'Karnataka' },
      '560009': { city: 'Bangalore', state: 'Karnataka' },
      '560010': { city: 'Bangalore', state: 'Karnataka' },

      // Hyderabad
      '500001': { city: 'Hyderabad', state: 'Telangana' },
      '500002': { city: 'Hyderabad', state: 'Telangana' },
      '500003': { city: 'Hyderabad', state: 'Telangana' },
      '500004': { city: 'Hyderabad', state: 'Telangana' },
      '500005': { city: 'Hyderabad', state: 'Telangana' },
      '500006': { city: 'Hyderabad', state: 'Telangana' },
      '500007': { city: 'Hyderabad', state: 'Telangana' },
      '500008': { city: 'Hyderabad', state: 'Telangana' },
      '500009': { city: 'Hyderabad', state: 'Telangana' },
      '500010': { city: 'Hyderabad', state: 'Telangana' },

      // Chennai
      '600001': { city: 'Chennai', state: 'Tamil Nadu' },
      '600002': { city: 'Chennai', state: 'Tamil Nadu' },
      '600003': { city: 'Chennai', state: 'Tamil Nadu' },
      '600004': { city: 'Chennai', state: 'Tamil Nadu' },
      '600005': { city: 'Chennai', state: 'Tamil Nadu' },
      '600006': { city: 'Chennai', state: 'Tamil Nadu' },
      '600007': { city: 'Chennai', state: 'Tamil Nadu' },
      '600008': { city: 'Chennai', state: 'Tamil Nadu' },
      '600009': { city: 'Chennai', state: 'Tamil Nadu' },
      '600010': { city: 'Chennai', state: 'Tamil Nadu' },

      // Kolkata
      '700001': { city: 'Kolkata', state: 'West Bengal' },
      '700002': { city: 'Kolkata', state: 'West Bengal' },
      '700003': { city: 'Kolkata', state: 'West Bengal' },
      '700004': { city: 'Kolkata', state: 'West Bengal' },
      '700005': { city: 'Kolkata', state: 'West Bengal' },
      '700006': { city: 'Kolkata', state: 'West Bengal' },
      '700007': { city: 'Kolkata', state: 'West Bengal' },
      '700008': { city: 'Kolkata', state: 'West Bengal' },
      '700009': { city: 'Kolkata', state: 'West Bengal' },
      '700010': { city: 'Kolkata', state: 'West Bengal' },

      // Pune
      '411001': { city: 'Pune', state: 'Maharashtra' },
      '411002': { city: 'Pune', state: 'Maharashtra' },
      '411003': { city: 'Pune', state: 'Maharashtra' },
      '411004': { city: 'Pune', state: 'Maharashtra' },
      '411005': { city: 'Pune', state: 'Maharashtra' },
      '411006': { city: 'Pune', state: 'Maharashtra' },
      '411007': { city: 'Pune', state: 'Maharashtra' },
      '411008': { city: 'Pune', state: 'Maharashtra' },
      '411009': { city: 'Pune', state: 'Maharashtra' },
      '411010': { city: 'Pune', state: 'Maharashtra' },

      // Ahmedabad
      '380001': { city: 'Ahmedabad', state: 'Gujarat' },
      '380002': { city: 'Ahmedabad', state: 'Gujarat' },
      '380003': { city: 'Ahmedabad', state: 'Gujarat' },
      '380004': { city: 'Ahmedabad', state: 'Gujarat' },
      '380005': { city: 'Ahmedabad', state: 'Gujarat' },
      '380006': { city: 'Ahmedabad', state: 'Gujarat' },
      '380007': { city: 'Ahmedabad', state: 'Gujarat' },
      '380008': { city: 'Ahmedabad', state: 'Gujarat' },
      '380009': { city: 'Ahmedabad', state: 'Gujarat' },
      '380010': { city: 'Ahmedabad', state: 'Gujarat' },
    };

    return pinCodeMap[cleanPinCode] || null;
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
            label={t('register.businessNumber', 'Business Number')}
            placeholder={t('register.businessNumberPlaceholder', '9876543210')}
            value={phone}
            editable={false}
            error={errors.phone}
            icon="call-outline"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <View style={styles.phoneVerifyContainer}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.verifiedBadgeText}>{t('register.verified', 'Verified')}</Text>
            </View>
          </View>
          <TextInput
            label={t('register.businessEmail', 'Business Email')}
            placeholder={t('login.emailPlaceholder', 'you@example.com')}
            value={email}
            onChangeText={(value) => {
              setEmail(value.trim().toLowerCase());
              resetEmailVerification();
              clearError('email');
            }}
            error={errors.email}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isEmailVerified}
          />
          <View style={styles.phoneVerifyContainer}>
            {isEmailVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.verifiedBadgeText}>{t('register.verified', 'Verified')}</Text>
              </View>
            ) : (
              <Button
                title={isEmailOtpSent ? t('register.resendOtp', 'Resend OTP') : t('register.sendOtp', 'Send OTP')}
                onPress={handleSendEmailOtp}
                loading={isSendingEmailOtp}
                disabled={isSendingEmailOtp || !EMAIL_REGEX.test(normalizeEmail(email))}
                size="sm"
              />
            )}
          </View>

          {isEmailOtpSent && !isEmailVerified ? (
            <View style={styles.phoneOtpContainer}>
              <TextInput
                label={t('register.enterOtp', 'Enter verification code')}
                placeholder={t('otp.placeholder', '000000')}
                value={emailOtpInput}
                onChangeText={(value) => {
                  setEmailOtpInput(value.replace(/\D/g, '').slice(0, 6));
                  if (emailOtpError) setEmailOtpError('');
                }}
                icon="shield-checkmark-outline"
                keyboardType="number-pad"
                maxLength={6}
                error={emailOtpError || undefined}
              />
              <Button
                title={t('register.verify', 'Verify')}
                onPress={handleVerifyEmailOtp}
                loading={isVerifyingEmailOtp}
                disabled={isVerifyingEmailOtp || emailOtpInput.length !== 6}
                size="sm"
              />
              <Text style={styles.phoneOtpHint}>
                {t('register.emailCodeHint', 'Enter the 6-digit code sent to your email.')}
              </Text>
            </View>
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
        <Text style={styles.inputLabel}>{t('register.chapter', 'Chapter')}</Text>
        <View style={styles.dropdownWrapper}>
          <View
            style={[
              styles.dropdownInputRow,
              chapterDropdownOpen && styles.dropdownInputRowFocused,
              errors.chapterId && styles.dropdownInputRowError,
            ]}
          >
            <Ionicons name="people-outline" size={18} color={colors.textTertiary} />
            <RNTextInput
              style={styles.dropdownSearchInput}
              value={chapterId ? chapterSearch : chapterSearch}
              onChangeText={(text) => {
                setChapterId('');
                setChapterSearch(text);
                setChapterDropdownOpen(true);
                clearError('chapterId');
              }}
              onFocus={() => setChapterDropdownOpen(true)}
              onBlur={() => {
                setTimeout(() => setChapterDropdownOpen(false), Platform.OS === 'android' ? 300 : 180);
              }}
              placeholder={t('register.chapterPlaceholder', 'Search and select your chapter')}
              placeholderTextColor={colors.textTertiary}
            />
            {chapterId ? (
              <TouchableOpacity onPress={handleClearChapter}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
            )}
          </View>

          {chapterDropdownOpen ? (
            <ScrollView
              style={[styles.dropdownList, { maxHeight: dropdownMaxHeight }]}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {filteredChapters.length > 0 ? (
                filteredChapters.map((chapter) => (
                  <TouchableOpacity
                    key={chapter.id}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectChapter(chapter)}
                  >
                    <View style={styles.chapterOptionTextWrap}>
                      <Text style={styles.dropdownItemText}>{chapter.name}</Text>
                      {[chapter.location?.city, chapter.location?.state].filter(Boolean).length > 0 ? (
                        <Text style={styles.chapterOptionMeta}>
                          {[chapter.location?.city, chapter.location?.state].filter(Boolean).join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    {chapter.id === chapterId ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyDropdownText}>
                  {t('register.noChaptersFound', 'No chapters found')}
                </Text>
              )}
            </ScrollView>
          ) : null}

          {errors.chapterId ? <Text style={styles.errorText}>{errors.chapterId}</Text> : null}
        </View>
        <View style={styles.addressAutocompleteWrap}>
          <TextInput
            label={t('register.businessAddress', 'Business Address')}
            placeholder={t('register.businessAddressPlaceholder', 'Start typing your business address')}
            value={businessAddress}
            onChangeText={(value) => {
              setBusinessAddress(value);
              setBusinessPlaceId('');
              setBusinessLatitude(undefined);
              setBusinessLongitude(undefined);
              setIsAddressDropdownOpen(value.trim().length >= 3);
              clearError('businessAddress');
            }}
            onFocus={() => {
              if (addressPredictions.length > 0) setIsAddressDropdownOpen(true);
            }}
            error={errors.businessAddress}
            icon="location-outline"
            multiline
            numberOfLines={3}
            style={styles.multiline}
          />
          {isFetchingAddressPredictions || isSelectingAddress ? (
            <View style={styles.addressLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.addressLoadingText}>
                {isSelectingAddress
                  ? t('register.loadingAddress', 'Filling address...')
                  : t('register.searchingAddress', 'Searching addresses...')}
              </Text>
            </View>
          ) : null}
          {isAddressDropdownOpen && addressPredictions.length > 0 ? (
            <View style={styles.addressSuggestions}>
              {addressPredictions.map((prediction) => (
                <TouchableOpacity
                  key={prediction.placeId}
                  style={styles.addressSuggestionItem}
                  onPress={() => handleSelectAddressPrediction(prediction)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <Text style={styles.addressSuggestionText}>{prediction.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        <TextInput
          label={t('register.area', 'Area')}
          placeholder={t('register.areaPlaceholder', 'Area / locality (optional)')}
          value={businessArea}
          onChangeText={setBusinessArea}
          icon="map-outline"
        />
        <TextInput
          label={t('register.pinCode', 'PIN Code')}
          placeholder={t('register.pinCodePlaceholder', '6-digit PIN code')}
          value={businessPinCode}
          onChangeText={(value) => {
            const cleanedValue = value.replace(/\D/g, '').slice(0, 6);
            setBusinessPinCode(cleanedValue);
            clearError('pinCode');

            // Auto-fill city and state from PIN code
            if (cleanedValue.length === 6) {
              const location = lookupCityStateFromPinCode(cleanedValue);
              if (location) {
                setBusinessCity(location.city);
                setBusinessState(location.state);
                clearError('city');
                clearError('state');
              }
            }
          }}
          error={errors.pinCode}
          icon="pin-outline"
          keyboardType="number-pad"
          maxLength={6}
        />
        <View style={styles.addressGrid}>
          <TextInput
            label={t('register.city', 'City')}
            placeholder={t('register.cityPlaceholder', 'City')}
            value={businessCity}
            onChangeText={(value) => {
              setBusinessCity(value);
              clearError('city');
            }}
            error={errors.city}
            icon="business-outline"
            containerStyle={styles.addressGridItem}
          />
          <TextInput
            label={t('register.state', 'State')}
            placeholder={t('register.statePlaceholder', 'State')}
            value={businessState}
            onChangeText={(value) => {
              setBusinessState(value);
              clearError('state');
            }}
            error={errors.state}
            icon="map-outline"
            containerStyle={styles.addressGridItem}
          />
        </View>
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
  chapterOptionTextWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  chapterOptionMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
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
  addressAutocompleteWrap: {
    position: 'relative',
    zIndex: 20,
  },
  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  addressLoadingText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  addressSuggestions: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  addressSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addressSuggestionText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  addressGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  addressGridItem: {
    flex: 1,
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
