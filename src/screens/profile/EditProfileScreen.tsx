import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, TextInput as RNTextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import * as ImagePicker from 'expo-image-picker';
import { rtdb } from '../../../firebase.config';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Section } from '../../components/layout/Section';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Chip } from '../../components/ui/Chip';
import { useAuthStore } from '../../stores/authStore';
import { useBusinessConfig } from '../../hooks/useRealtimeData';
import { useDropdownMaxHeight } from '../../hooks/useKeyboardHeight';
import { uploadProfilePhoto } from '../../services/firebase/storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import type { ProfileStackParamList, User } from '../../types';

type Props = StackScreenProps<ProfileStackParamList, 'EditProfile'>;

const normalizeTag = (value: string): string => value.trim().replace(/\s+/g, ' ');
const hasTag = (tags: string[], value: string): boolean =>
  tags.some((tag) => tag.toLowerCase() === value.toLowerCase());

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { config: businessConfig } = useBusinessConfig();
  const didInitRef = useRef(false);
  const lastUidRef = useRef<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [customServicesByCategory, setCustomServicesByCategory] = useState<Record<string, string[]>>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [googleBusiness, setGoogleBusiness] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const serviceInputRef = useRef<RNTextInput | null>(null);
  const dropdownMaxHeight = useDropdownMaxHeight(250);

  useEffect(() => {
    if (!authUser) {
      didInitRef.current = false;
      lastUidRef.current = null;
      return;
    }

    if (lastUidRef.current !== authUser.uid) {
      didInitRef.current = false;
      lastUidRef.current = authUser.uid;
    }

    if (didInitRef.current) return;
    setName(authUser.name || '');
    setPhone(authUser.phone || '');
    setBusinessName(authUser.businessName || '');
    setBusinessDescription(authUser.businessDescription || '');
    setBusinessAddress(authUser.businessAddress || '');
    setBusinessCategory(authUser.businessCategory || '');
    setCategorySearch(authUser.businessCategory || '');
    setSelectedServices(authUser.services || []);
    setSelectedTags(authUser.businessTags || []);
    setInstagram(authUser.socialLinks.instagram || '');
    setFacebook(authUser.socialLinks.facebook || '');
    setWhatsapp(authUser.socialLinks.whatsapp || authUser.phone || '');
    setLinkedin(authUser.socialLinks.linkedin || '');
    setGoogleBusiness(authUser.socialLinks.google || '');
    didInitRef.current = true;
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    setPhotoUri(authUser.photoURL || '');
  }, [authUser?.photoURL]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return businessConfig.businessCategories;
    return businessConfig.businessCategories.filter((cat) => cat.toLowerCase().includes(q));
  }, [businessConfig.businessCategories, categorySearch]);
  const normalizedCategorySearch = normalizeTag(categorySearch);
  const canCreateCategory = !!normalizedCategorySearch
    && !businessConfig.businessCategories.some((cat) => cat.toLowerCase() === normalizedCategorySearch.toLowerCase());

  const showCategoryDropdown = categoryDropdownOpen && !businessCategory;

  const availableServices = useMemo(() => {
    if (!businessCategory) return [];
    const base = businessConfig.servicesByCategory[businessCategory] ?? [];
    const custom = customServicesByCategory[businessCategory] ?? [];
    const unique: string[] = [];
    [...base, ...custom].forEach((service) => {
      const clean = normalizeTag(service);
      if (clean && !hasTag(unique, clean)) unique.push(clean);
    });
    return unique;
  }, [businessCategory, businessConfig.servicesByCategory, customServicesByCategory]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    return availableServices
      .filter((service) => !hasTag(selectedServices, service))
      .filter((service) => !q || service.toLowerCase().includes(q));
  }, [availableServices, selectedServices, serviceSearch]);

  const normalizedServiceSearch = normalizeTag(serviceSearch);
  const canCreateService = !!businessCategory
    && !!normalizedServiceSearch
    && !hasTag(availableServices, normalizedServiceSearch)
    && !hasTag(selectedServices, normalizedServiceSearch);
  const showServicesDropdown = serviceDropdownOpen
    && !!businessCategory
    && (serviceSearch.trim().length > 0 || filteredServices.length > 0 || canCreateService);

  const handleSelectCategory = (cat: string) => {
    const categoryChanged = businessCategory !== cat;
    setBusinessCategory(cat);
    setCategorySearch(cat);
    setCategoryDropdownOpen(false);
    setServiceSearch('');
    setServiceDropdownOpen(false);
    if (categoryChanged) {
      setSelectedServices([]);
    }
  };

  const handleClearCategory = () => {
    setBusinessCategory('');
    setCategorySearch('');
    setCategoryDropdownOpen(false);
    setServiceSearch('');
    setServiceDropdownOpen(false);
    setSelectedServices([]);
  };

  const handleAddService = (service: string) => {
    const clean = normalizeTag(service);
    if (!clean) return;
    setSelectedServices((prev) => (hasTag(prev, clean) ? prev : [...prev, clean]));
    setServiceSearch('');
    setServiceDropdownOpen(false);
  };

  const handleRemoveService = (service: string) => {
    setSelectedServices((prev) => prev.filter((item) => item.toLowerCase() !== service.toLowerCase()));
  };

  const handleCreateService = () => {
    if (!businessCategory || !canCreateService) return;
    const newService = normalizedServiceSearch;
    setCustomServicesByCategory((prev) => {
      const current = prev[businessCategory] ?? [];
      if (hasTag(current, newService)) return prev;
      return { ...prev, [businessCategory]: [...current, newService] };
    });
    handleAddService(newService);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSave = async () => {
    if (!authUser?.uid) {
      Alert.alert(t('common.error'), t('common.somethingWentWrong', 'Something went wrong'));
      return;
    }
    if (!name.trim() || !businessName.trim()) {
      Alert.alert(t('common.error'), t('editProfile.requiredFields'));
      return;
    }

    const parts = name.trim().split(/\s+/);
    const firstName = authUser.firstName || parts[0] || '';
    const lastName = authUser.lastName || parts.slice(1).join(' ');
    const now = new Date().toISOString();

    const payload: Partial<User> = {
      name: name.trim(),
      firstName,
      lastName,
      phone: phone.trim(),
      businessName: businessName.trim(),
      businessDescription: businessDescription.trim(),
      businessAddress: businessAddress.trim(),
      businessCategory: businessCategory.trim(),
      services: selectedServices,
      businessTags: selectedTags,
      socialLinks: {
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        whatsapp: whatsapp.trim(),
        linkedin: linkedin.trim(),
        google: googleBusiness.trim(),
      },
      updatedAt: now,
    };

    setIsSaving(true);
    try {
      await update(ref(rtdb, `users/${authUser.uid}`), payload as Record<string, unknown>);
      setUser({ ...authUser, ...payload });
      Alert.alert(t('editProfile.saved'), t('editProfile.savedMessage'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert(t('common.error'), t('editProfile.saveError', 'Failed to save profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePhoto = async () => {
    if (!authUser?.uid) {
      Alert.alert(t('common.error'), t('common.somethingWentWrong', 'Something went wrong'));
      return;
    }
    if (isUploadingPhoto) return;

    const previousUri = photoUri || authUser.photoURL || '';

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.permissionRequired', 'Permission required'),
          t('editProfile.photoPermission', 'Please allow access to your photos to change your profile picture.'),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      const localUri = !result.canceled && result.assets?.[0]?.uri ? result.assets[0].uri : '';
      if (!localUri) return;

      setPhotoUri(localUri);
      setIsUploadingPhoto(true);

      const downloadUrl = await uploadProfilePhoto(authUser.uid, localUri);
      const now = new Date().toISOString();

      await update(ref(rtdb, `users/${authUser.uid}`), { photoURL: downloadUrl, updatedAt: now });
      setUser({ ...authUser, photoURL: downloadUrl, updatedAt: now });
      setPhotoUri(downloadUrl);
    } catch (err: unknown) {
      setPhotoUri(previousUri);
      const message =
        err && typeof (err as { message?: string }).message === 'string'
          ? (err as { message: string }).message
          : t('editProfile.photoUploadError', 'Failed to update profile photo');
      Alert.alert(t('common.error', 'Error'), message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (!authUser) {
    return (
      <ScreenWrapper uniformLayout>
        <Header title={t('editProfile.title')} onBack={() => navigation.goBack()} />
        <Text style={styles.emptyUserText}>{t('profile.noProfileData', 'No profile data found')}</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper uniformLayout>
      <Header title={t('editProfile.title')} onBack={() => navigation.goBack()} />

      <View style={styles.photoSection}>
        <View style={styles.photoWrapper}>
          <Avatar uri={photoUri || authUser.photoURL} name={name || authUser.email} size="xl" />
          {isUploadingPhoto ? (
            <View style={styles.photoUploadingOverlay}>
              <ActivityIndicator size="small" color={colors.textInverse} />
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.changePhotoButton, isUploadingPhoto ? styles.changePhotoButtonDisabled : null]}
          onPress={handleChangePhoto}
          disabled={isUploadingPhoto}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={18} color={colors.primary} />
          <Text style={styles.changePhotoText}>
            {isUploadingPhoto ? t('common.loading', 'Loading...') : t('editProfile.changePhoto')}
          </Text>
        </TouchableOpacity>
      </View>

      <Section title={t('editProfile.personalInfo')}>
        <TextInput
          label={t('editProfile.fullName')}
          value={name}
          onChangeText={setName}
          icon="person-outline"
          placeholder={t('editProfile.fullNamePlaceholder')}
        />
        <TextInput
          label={t('editProfile.phone')}
          value={phone}
          onChangeText={setPhone}
          icon="call-outline"
          placeholder={t('editProfile.phonePlaceholder')}
          keyboardType="phone-pad"
        />
      </Section>

      <Section title={t('editProfile.businessInfo')}>
        <TextInput
          label={t('editProfile.businessName')}
          value={businessName}
          onChangeText={setBusinessName}
          icon="business-outline"
          placeholder={t('editProfile.businessNamePlaceholder')}
        />
        <TextInput
          label={t('editProfile.businessDescription')}
          value={businessDescription}
          onChangeText={setBusinessDescription}
          icon="document-text-outline"
          placeholder={t('editProfile.descriptionPlaceholder')}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
        <TextInput
          label={t('profile.businessAddress', 'Business Address')}
          value={businessAddress}
          onChangeText={setBusinessAddress}
          icon="location-outline"
          placeholder={t('register.businessAddressPlaceholder', 'Enter your business address')}
          multiline
        />

        <Text style={styles.inputLabel}>{t('editProfile.category')}</Text>
        <View style={styles.categoryDropdownWrapper}>
          <View style={styles.categoryInputRow}>
            <Ionicons name="grid-outline" size={18} color={colors.textTertiary} />
            <RNTextInput
              style={styles.categorySearchInput}
              value={businessCategory || categorySearch}
              onChangeText={(text) => {
                if (!businessCategory) {
                  setCategorySearch(text);
                  setCategoryDropdownOpen(true);
                }
              }}
              onFocus={() => {
                if (!businessCategory) setCategoryDropdownOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => setCategoryDropdownOpen(false), 180);
              }}
              placeholder={t('editProfile.selectCategory')}
              placeholderTextColor={colors.textTertiary}
              editable={!businessCategory}
            />
            {businessCategory ? (
              <TouchableOpacity onPress={handleClearCategory}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
            )}
          </View>

          {showCategoryDropdown && (filteredCategories.length > 0 || canCreateCategory) ? (
            <ScrollView style={[styles.categoryDropdownList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {canCreateCategory ? (
                <TouchableOpacity style={styles.serviceCreateItem} onPress={() => handleSelectCategory(normalizedCategorySearch)}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.serviceCreateText}>
                    {t('editProfile.createCategoryTag', 'Create "{{category}}"', { category: normalizedCategorySearch })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {filteredCategories.map((cat) => (
                <TouchableOpacity key={cat} style={styles.categoryDropdownItem} onPress={() => handleSelectCategory(cat)}>
                  <Text style={styles.categoryDropdownItemText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <Text style={styles.inputLabel}>{t('profile.servicesOffered', 'Services Offered')}</Text>
        <View style={styles.servicesDropdownWrapper}>
          <View
            style={[
              styles.serviceInputRow,
              serviceDropdownOpen && styles.serviceInputRowFocused,
              !businessCategory && styles.serviceInputRowDisabled,
            ]}
          >
            <Ionicons name="construct-outline" size={18} color={colors.textTertiary} style={styles.serviceSearchIcon} />
            <RNTextInput
              ref={serviceInputRef}
              style={styles.serviceSearchInput}
              value={serviceSearch}
              onChangeText={(text) => {
                setServiceSearch(text);
                if (businessCategory) setServiceDropdownOpen(true);
              }}
              onFocus={() => {
                if (!businessCategory) return;
                setCategoryDropdownOpen(false);
                setServiceDropdownOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => setServiceDropdownOpen(false), 180);
              }}
              placeholder={
                businessCategory
                  ? t('editProfile.serviceSearchPlaceholder', 'Search or add a service')
                  : t('editProfile.serviceSelectCategoryFirst', 'Select category first')
              }
              placeholderTextColor={colors.textTertiary}
              editable={!!businessCategory}
            />
            {serviceSearch.trim().length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setServiceSearch('');
                  if (businessCategory) {
                    setServiceDropdownOpen(true);
                    setTimeout(() => serviceInputRef.current?.focus(), 50);
                  }
                }}
              >
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
            )}
          </View>

          {selectedServices.length > 0 ? (
            <View style={styles.selectedServicesWrap}>
              {selectedServices.map((service) => (
                <View key={service} style={styles.selectedServiceChip}>
                  <Text style={styles.selectedServiceChipText}>{service}</Text>
                  <TouchableOpacity onPress={() => handleRemoveService(service)}>
                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {showServicesDropdown ? (
            <ScrollView style={[styles.servicesDropdownList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {canCreateService ? (
                <TouchableOpacity style={styles.serviceCreateItem} onPress={handleCreateService}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.serviceCreateText}>
                    {t('editProfile.createServiceTag', 'Create "{{service}}"', { service: normalizedServiceSearch })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {filteredServices.length === 0 && !canCreateService ? (
                <Text style={styles.serviceEmptyText}>{t('editProfile.noServiceMatch', 'No matching services found')}</Text>
              ) : (
                filteredServices.map((service) => (
                  <TouchableOpacity key={service} style={styles.servicesDropdownItem} onPress={() => handleAddService(service)}>
                    <Text style={styles.servicesDropdownItemText}>{service}</Text>
                    <Ionicons name="add" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          ) : null}
        </View>
      </Section>

      <Section title={t('editProfile.tags')}>
        <View style={styles.chipRow}>
          {(businessConfig.tagsByCategory?.[businessCategory] ?? businessConfig.popularTags).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              selected={selectedTags.includes(tag)}
              onPress={() => toggleTag(tag)}
            />
          ))}
        </View>
      </Section>

      <Section title={t('editProfile.socialLinks')}>
        <TextInput
          label="Instagram"
          value={instagram}
          onChangeText={setInstagram}
          icon="logo-instagram"
          placeholder={t('editProfile.instagramPlaceholder')}
        />
        <TextInput
          label="Facebook"
          value={facebook}
          onChangeText={setFacebook}
          icon="logo-facebook"
          placeholder={t('editProfile.facebookPlaceholder')}
        />
        <TextInput
          label="WhatsApp"
          value={whatsapp}
          onChangeText={setWhatsapp}
          icon="logo-whatsapp"
          placeholder={t('editProfile.whatsappPlaceholder')}
          keyboardType="phone-pad"
        />
        <TextInput
          label="LinkedIn"
          value={linkedin}
          onChangeText={setLinkedin}
          icon="logo-linkedin"
          placeholder={t('editProfile.linkedinPlaceholder')}
        />
        <TextInput
          label={t('register.googleBusiness', 'Google Business Profile')}
          value={googleBusiness}
          onChangeText={setGoogleBusiness}
          icon="logo-google"
          placeholder={t('register.googleBusinessPlaceholder', 'Google Business URL (optional)')}
          autoCapitalize="none"
        />
      </Section>

      <Button
        title={t('editProfile.save')}
        onPress={handleSave}
        loading={isSaving}
        fullWidth
        icon="checkmark-outline"
        style={styles.saveButton}
      />
    </ScreenWrapper>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  emptyUserText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  photoWrapper: {
    position: 'relative',
  },
  photoUploadingOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    gap: spacing.sm,
  },
  changePhotoButtonDisabled: {
    opacity: 0.7,
  },
  changePhotoText: {
    ...typography.bodySmallMedium,
    color: colors.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputLabel: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  categoryDropdownWrapper: {
    marginBottom: spacing.lg,
  },
  categoryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
    gap: spacing.sm,
  },
  categorySearchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
    margin: 0,
  },
  categoryDropdownList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    maxHeight: 250,
    overflow: 'hidden',
    ...shadows.md,
  },
  categoryDropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  categoryDropdownItemText: {
    ...typography.body,
    color: colors.text,
  },
  servicesDropdownWrapper: {
    marginBottom: spacing.lg,
  },
  serviceInputRow: {
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
  serviceInputRowFocused: {
    borderColor: colors.primary,
  },
  serviceInputRowDisabled: {
    opacity: 0.75,
  },
  serviceSearchIcon: {
    marginRight: spacing.xs,
  },
  serviceSearchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    padding: 0,
    margin: 0,
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
  servicesDropdownList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    maxHeight: 250,
    overflow: 'hidden',
    ...shadows.md,
  },
  serviceCreateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  serviceCreateText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  servicesDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  servicesDropdownItemText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  serviceEmptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  saveButton: {
    marginTop: spacing.xl,
    marginBottom: spacing['4xl'],
  },
});
