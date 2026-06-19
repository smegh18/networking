import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SearchBar } from '../ui/SearchBar';
import { AskCard } from './AskCard';
import { EmptyState } from '../ui/EmptyState';
import { useBusinessConfig, useRealtimeCollection } from '../../hooks/useRealtimeData';
import { useDropdownMaxHeight } from '../../hooks/useKeyboardHeight';
import { createCollectionItem } from '../../services/firebase/realtimeDb';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import type { Ask, Chapter, User } from '../../types';
import { normalizeStringArray, normalizeText, normalizeTextLower } from '../../utils/helpers';

interface AskBoardProps {
  onGiveReferral?: (ask: Ask) => void;
  onSchedule?: (ask: Ask) => void;
}

type FilterKey = 'category' | 'subcategory' | 'chapter';

export const AskBoard: React.FC<AskBoardProps> = ({ onGiveReferral, onSchedule }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 520;
  const currentUser = useAuthStore((s) => s.user);
  const { config: businessConfig } = useBusinessConfig();
  const { items: asks } = useRealtimeCollection<Ask>('asks');
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
  const { items: users } = useRealtimeCollection<User>('users', 'uid');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [subcategorySearch, setSubcategorySearch] = useState('');
  const [chapterSearch, setChapterSearch] = useState('');
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const ignoreBlurRef = useRef<FilterKey | null>(null);
  const [showPutAskModal, setShowPutAskModal] = useState(false);
  const [askService, setAskService] = useState('');
  const [askCategory, setAskCategory] = useState('');
  const [askCategorySearch, setAskCategorySearch] = useState('');
  const [askCategoryDropdownOpen, setAskCategoryDropdownOpen] = useState(false);
  const [askSubcategoryDropdownOpen, setAskSubcategoryDropdownOpen] = useState(false);
  const [askDescription, setAskDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownMaxHeight = useDropdownMaxHeight(250);

  // Defensive copies so we never rely on possibly undefined config arrays
  const businessCategories = useMemo(
    () => normalizeStringArray(businessConfig.businessCategories),
    [businessConfig.businessCategories],
  );

  const servicesByCategory = useMemo(() => {
    const raw = businessConfig.servicesByCategory;
    return raw && typeof raw === 'object' ? raw : {};
  }, [businessConfig.servicesByCategory]);

  const categoryOptions = useMemo(() => {
    const fromAsks = asks.map((ask) => normalizeText(ask.category)).filter(Boolean);
    const merged = Array.from(new Set([...businessCategories, ...fromAsks])).sort();
    return merged.map((cat) => ({ value: cat, label: cat }));
  }, [asks, businessCategories]);

  const subcategoryOptions = useMemo(() => {
    if (!selectedCategory) return [];
    const raw = (servicesByCategory as Record<string, unknown>)[selectedCategory];
    return Array.from(new Set(normalizeStringArray(raw))).sort();
  }, [selectedCategory, servicesByCategory]);

  const chapterOptions = useMemo(
    () =>
      chapters
        .map((ch) => ({ value: ch.id, label: normalizeText(ch.name) }))
        .filter((ch) => !!ch.value && !!ch.label),
    [chapters],
  );

  const userByUid = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => {
      if (u?.uid) map[u.uid] = u;
    });
    return map;
  }, [users]);

  const filteredCategoryOptions = useMemo(() => {
    const q = normalizeTextLower(categorySearch);
    if (!q) return categoryOptions;
    return categoryOptions.filter((opt) => normalizeTextLower(opt.label).includes(q));
  }, [categoryOptions, categorySearch]);

  const filteredChapterOptions = useMemo(() => {
    const q = normalizeTextLower(chapterSearch);
    if (!q) return chapterOptions;
    return chapterOptions.filter((opt) => normalizeTextLower(opt.label).includes(q));
  }, [chapterOptions, chapterSearch]);

  const filteredSubcategoryOptions = useMemo(() => {
    const q = normalizeTextLower(subcategorySearch);
    if (!q) return subcategoryOptions;
    return subcategoryOptions.filter((tag) => normalizeTextLower(tag).includes(q));
  }, [subcategoryOptions, subcategorySearch]);

  const filteredAsks = useMemo(() => {
    let items = asks;
    const q = normalizeTextLower(searchQuery);

    if (q) {
      items = items.filter(
        (a) =>
          normalizeTextLower(a.service).includes(q) ||
          normalizeTextLower(a.category).includes(q) ||
          normalizeTextLower(a.description).includes(q) ||
          normalizeTextLower(a.askerName).includes(q),
      );
    }

    if (selectedCategory) {
      items = items.filter((a) => a.category === selectedCategory);
    }

    if (selectedSubcategory) {
      const wanted = normalizeTextLower(selectedSubcategory);
      items = items.filter((a) => normalizeTextLower(a.service) === wanted);
    }

    if (selectedChapter) {
      items = items.filter((a) => userByUid[a.askerUid]?.chapterId === selectedChapter);
    }

    return [...items].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [asks, searchQuery, selectedCategory, selectedSubcategory, selectedChapter, userByUid]);

  // Reset subcategory when category changes/clears.
  React.useEffect(() => {
    setSelectedSubcategory('');
    setSubcategorySearch('');
    if (openFilter === 'subcategory') setOpenFilter(null);
  }, [selectedCategory]);

  const filteredCategories = useMemo(() => {
    const q = normalizeTextLower(askCategorySearch);
    if (!q) return businessCategories;
    return businessCategories.filter((cat) => normalizeTextLower(cat).includes(q));
  }, [askCategorySearch, businessCategories]);

  const showCategoryDropdown = askCategoryDropdownOpen && askCategorySearch.trim().length > 0 && !askCategory;

  const handleSelectCategory = (cat: string) => {
    setAskCategory(cat);
    setAskCategorySearch(cat);
    setAskCategoryDropdownOpen(false);
    setAskService('');
    setAskSubcategoryDropdownOpen(false);
  };

  const handleClearCategory = () => {
    setAskCategory('');
    setAskCategorySearch('');
    setAskCategoryDropdownOpen(false);
    setAskService('');
    setAskSubcategoryDropdownOpen(false);
  };

  const handleSubmitAsk = async () => {
    if (!currentUser?.uid) {
      Alert.alert(t('common.error', 'Error'), t('common.somethingWentWrong', 'Something went wrong'));
      return;
    }
    if (!askService.trim() || !askDescription.trim() || !askCategory.trim()) {
      if (Platform.OS === 'web') {
        window.alert(t('ask.fillAllFields'));
      } else {
        Alert.alert(t('ask.title'), t('ask.fillAllFields'));
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await createCollectionItem('asks', {
        service: askService.trim(),
        category: askCategory.trim(),
        description: askDescription.trim(),
        askerName: currentUser.name,
        askerUid: currentUser.uid,
        askerBusinessName: currentUser.businessName,
        askerPhone: currentUser.phone,
        askerWhatsapp: currentUser.socialLinks.whatsapp || currentUser.phone,
        createdAt: new Date().toISOString(),
      });
      setShowPutAskModal(false);
      setAskService('');
      setAskCategory('');
      setAskCategorySearch('');
      setAskDescription('');
      if (Platform.OS === 'web') {
        window.alert(t('ask.askSubmitted'));
      } else {
        Alert.alert(t('ask.title'), t('ask.askSubmitted'));
      }
    } catch {
      Alert.alert(t('common.error', 'Error'), t('ask.submitFailed', 'Failed to submit ask'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('ask.title')}</Text>
        <TouchableOpacity style={styles.putAskBtn} onPress={() => setShowPutAskModal(true)}>
          <Ionicons name="add-circle-outline" size={16} color={colors.textInverse} />
          <Text style={styles.putAskBtnText}>{t('ask.putMyAsk')}</Text>
        </TouchableOpacity>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('ask.searchPlaceholder')}
      />

      <View style={isMobile ? styles.filterColumn : styles.filterRow}>
        <View
          style={[
            isMobile ? styles.filterDropdownWrapMobile : styles.filterDropdownWrap,
            isMobile && (openFilter === 'category' ? { zIndex: 30 } : { zIndex: 1 }),
          ]}
        >
          <Text style={styles.filterLabel}>{t('ask.categoryFilter', 'Category')}</Text>
          <View style={[styles.filterTrigger, openFilter === 'category' && styles.filterTriggerFocused]}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.filterInput}
              value={openFilter === 'category' ? categorySearch : (selectedCategory ? categoryOptions.find((o) => o.value === selectedCategory)?.label ?? '' : '')}
              onChangeText={(text) => {
                setCategorySearch(text);
                if (openFilter !== 'category') setOpenFilter('category');
              }}
              onFocus={() => setOpenFilter('category')}
              onBlur={() => {
                setTimeout(() => {
                  if (ignoreBlurRef.current === 'category') {
                    ignoreBlurRef.current = null;
                    return;
                  }
                  setOpenFilter(null);
                }, 180);
              }}
              placeholder={!selectedCategory ? t('ask.allCategories', 'All categories') : t('ask.searchCategory', 'Search category...')}
              placeholderTextColor={colors.textTertiary}
            />
            <Pressable
              onPressIn={() => { ignoreBlurRef.current = 'category'; }}
              onPress={() => setOpenFilter((prev) => (prev === 'category' ? null : 'category'))}
              hitSlop={10}
              style={{ padding: 2 }}
            >
              <Ionicons name={openFilter === 'category' ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
          {openFilter === 'category' && (
            <View style={isMobile ? styles.filterPanelMobile : styles.filterPanel}>
              <ScrollView style={[styles.filterList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                  style={[styles.filterOption, !selectedCategory && styles.filterOptionSelected]}
                  onPress={() => { setSelectedCategory(''); setSelectedSubcategory(''); setCategorySearch(''); setSubcategorySearch(''); setOpenFilter(null); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterOptionText, !selectedCategory && styles.filterOptionTextSelected]}>{t('ask.allCategories', 'All categories')}</Text>
                  {!selectedCategory ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
                {filteredCategoryOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterOption, selectedCategory === opt.value && styles.filterOptionSelected]}
                    onPress={() => { setSelectedCategory(opt.value); setSelectedSubcategory(''); setCategorySearch(''); setSubcategorySearch(''); setOpenFilter(null); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterOptionText, selectedCategory === opt.value && styles.filterOptionTextSelected]}>{opt.label}</Text>
                    {selectedCategory === opt.value ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                ))}
                {filteredCategoryOptions.length === 0 ? <Text style={styles.filterEmpty}>{t('common.noResults', 'No matching options')}</Text> : null}
              </ScrollView>
            </View>
          )}
        </View>
        {isMobile ? <View style={styles.mobileSpacer} /> : null}
        {selectedCategory ? (
          <View
            style={[
              isMobile ? styles.filterDropdownWrapMobile : styles.filterDropdownWrap,
              isMobile && (openFilter === 'subcategory' ? { zIndex: 30 } : { zIndex: 1 }),
            ]}
          >
            <Text style={styles.filterLabel}>{t('ask.subCategoryFilter', 'Subcategory')}</Text>
            <View style={[styles.filterTrigger, openFilter === 'subcategory' && styles.filterTriggerFocused]}>
              <Ionicons name="options-outline" size={18} color={colors.textTertiary} />
              <TextInput
                style={styles.filterInput}
                value={openFilter === 'subcategory' ? subcategorySearch : selectedSubcategory}
                onChangeText={(text) => {
                  setSubcategorySearch(text);
                  if (openFilter !== 'subcategory') setOpenFilter('subcategory');
                }}
                onFocus={() => setOpenFilter('subcategory')}
                onBlur={() => {
                  setTimeout(() => {
                    if (ignoreBlurRef.current === 'subcategory') {
                      ignoreBlurRef.current = null;
                      return;
                    }
                    setOpenFilter(null);
                  }, 180);
                }}
                placeholder={!selectedSubcategory ? t('ask.allSubcategories', 'All subcategories') : t('ask.searchSubcategory', 'Search subcategory...')}
                placeholderTextColor={colors.textTertiary}
              />
              <Pressable
                onPressIn={() => { ignoreBlurRef.current = 'subcategory'; }}
                onPress={() => setOpenFilter((prev) => (prev === 'subcategory' ? null : 'subcategory'))}
                hitSlop={10}
                style={{ padding: 2 }}
              >
                <Ionicons name={openFilter === 'subcategory' ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
              </Pressable>
            </View>
            {openFilter === 'subcategory' && (
              <View style={isMobile ? styles.filterPanelMobile : styles.filterPanel}>
                <ScrollView style={[styles.filterList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={[styles.filterOption, !selectedSubcategory && styles.filterOptionSelected]}
                    onPress={() => { setSelectedSubcategory(''); setSubcategorySearch(''); setOpenFilter(null); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterOptionText, !selectedSubcategory && styles.filterOptionTextSelected]}>{t('ask.allSubcategories', 'All subcategories')}</Text>
                    {!selectedSubcategory ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                  {filteredSubcategoryOptions.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.filterOption, selectedSubcategory === tag && styles.filterOptionSelected]}
                      onPress={() => { setSelectedSubcategory(tag); setSubcategorySearch(''); setOpenFilter(null); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterOptionText, selectedSubcategory === tag && styles.filterOptionTextSelected]}>{tag}</Text>
                      {selectedSubcategory === tag ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  ))}
                  {filteredSubcategoryOptions.length === 0 ? <Text style={styles.filterEmpty}>{t('common.noResults', 'No matching options')}</Text> : null}
                </ScrollView>
              </View>
            )}
          </View>
        ) : null}
        {isMobile && selectedCategory ? <View style={styles.mobileSpacer} /> : null}

        <View
          style={[
            isMobile ? styles.filterDropdownWrapMobile : styles.filterDropdownWrap,
            isMobile && (openFilter === 'chapter' ? { zIndex: 30 } : { zIndex: 1 }),
          ]}
        >
          <Text style={styles.filterLabel}>{t('ask.chapterFilter', 'Chapter')}</Text>
          <View style={[styles.filterTrigger, openFilter === 'chapter' && styles.filterTriggerFocused]}>
            <Ionicons name="people-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.filterInput}
              value={openFilter === 'chapter' ? chapterSearch : (selectedChapter ? chapterOptions.find((o) => o.value === selectedChapter)?.label ?? '' : '')}
              onChangeText={(text) => {
                setChapterSearch(text);
                if (openFilter !== 'chapter') setOpenFilter('chapter');
              }}
              onFocus={() => setOpenFilter('chapter')}
              onBlur={() => {
                setTimeout(() => {
                  if (ignoreBlurRef.current === 'chapter') {
                    ignoreBlurRef.current = null;
                    return;
                  }
                  setOpenFilter(null);
                }, 180);
              }}
              placeholder={!selectedChapter ? t('ask.allChapters', 'All chapters') : t('ask.searchChapter', 'Search chapter...')}
              placeholderTextColor={colors.textTertiary}
            />
            <Pressable
              onPressIn={() => { ignoreBlurRef.current = 'chapter'; }}
              onPress={() => setOpenFilter((prev) => (prev === 'chapter' ? null : 'chapter'))}
              hitSlop={10}
              style={{ padding: 2 }}
            >
              <Ionicons name={openFilter === 'chapter' ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
          {openFilter === 'chapter' && (
            <View style={isMobile ? styles.filterPanelMobile : styles.filterPanel}>
              <ScrollView style={[styles.filterList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                  style={[styles.filterOption, !selectedChapter && styles.filterOptionSelected]}
                  onPress={() => { setSelectedChapter(''); setChapterSearch(''); setOpenFilter(null); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterOptionText, !selectedChapter && styles.filterOptionTextSelected]}>{t('ask.allChapters', 'All chapters')}</Text>
                  {!selectedChapter ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
                {filteredChapterOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.filterOption, selectedChapter === opt.value && styles.filterOptionSelected]}
                    onPress={() => { setSelectedChapter(opt.value); setChapterSearch(''); setOpenFilter(null); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterOptionText, selectedChapter === opt.value && styles.filterOptionTextSelected]}>{opt.label}</Text>
                    {selectedChapter === opt.value ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                ))}
                {filteredChapterOptions.length === 0 ? <Text style={styles.filterEmpty}>{t('common.noResults', 'No matching options')}</Text> : null}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {(selectedCategory || selectedChapter) ? (
        <TouchableOpacity
          style={styles.clearFiltersBtn}
          onPress={() => { setSelectedCategory(''); setSelectedSubcategory(''); setSelectedChapter(''); setOpenFilter(null); }}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          <Text style={styles.clearFiltersBtnText}>{t('common.clearFilters', 'Clear filters')}</Text>
        </TouchableOpacity>
      ) : null}

      {filteredAsks.length === 0 ? (
        <EmptyState
          icon="chatbox-ellipses-outline"
          title={t('ask.noAsks')}
          message={t('ask.noAsksMessage')}
        />
      ) : (
        filteredAsks.map((ask) => (
          <AskCard
            key={ask.id}
            ask={ask}
            chapterName={chapters.find((c) => c.id === userByUid[ask.askerUid]?.chapterId)?.name}
            onGiveReferral={(a) => onGiveReferral?.(a)}
            onSchedule={(a) => onSchedule?.(a)}
          />
        ))
      )}

      <Modal
        visible={showPutAskModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPutAskModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={(e) => {
            if (e.target === e.currentTarget) setShowPutAskModal(false);
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('ask.putMyAsk')}</Text>
              <TouchableOpacity onPress={() => setShowPutAskModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>{t('ask.categoryLabel')}</Text>
              <View style={styles.categoryDropdownWrapper}>
                <View style={styles.categoryInputRow}>
                  <Ionicons name="grid-outline" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={styles.categorySearchInput}
                    value={askCategory || askCategorySearch}
                    onChangeText={(text) => {
                      if (!askCategory) {
                        setAskCategorySearch(text);
                        setAskCategoryDropdownOpen(true);
                      }
                    }}
                    onFocus={() => {
                      if (!askCategory) setAskCategoryDropdownOpen(true);
                    }}
                    placeholder={t('ask.categoryPlaceholder') || 'Search category...'}
                    placeholderTextColor={colors.textTertiary}
                    editable={!askCategory}
                  />
                  {askCategory ? (
                    <TouchableOpacity onPress={handleClearCategory}>
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
                  )}
                </View>
                {showCategoryDropdown && filteredCategories.length > 0 ? (
                  <ScrollView style={[styles.categoryDropdownList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {filteredCategories.map((cat) => (
                      <TouchableOpacity key={cat} style={styles.categoryDropdownItem} onPress={() => handleSelectCategory(cat)}>
                        <Text style={styles.categoryDropdownItemText}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
              </View>

              {askCategory ? (
                <>
                  <Text style={styles.fieldLabel}>{t('ask.subCategoryLabel', 'Subcategory')}</Text>
                  <View style={styles.categoryDropdownWrapper}>
                    <View style={styles.categoryInputRow}>
                      <Ionicons name="options-outline" size={18} color={colors.textTertiary} />
                      <TextInput
                        style={styles.categorySearchInput}
                        value={askService}
                        onChangeText={(text) => {
                          setAskService(text);
                          setAskSubcategoryDropdownOpen(true);
                        }}
                        onFocus={() => setAskSubcategoryDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setAskSubcategoryDropdownOpen(false), 180)}
                        placeholder={t('ask.subCategoryPlaceholder', 'Select subcategory...')}
                        placeholderTextColor={colors.textTertiary}
                      />
                      {askService ? (
                        <TouchableOpacity onPress={() => setAskService('')}>
                          <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                      ) : (
                        <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
                      )}
                    </View>
                    {askSubcategoryDropdownOpen && (servicesByCategory as Record<string, string[]>)[askCategory] ? (
                      <ScrollView style={[styles.categoryDropdownList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {normalizeStringArray((servicesByCategory as Record<string, string[]>)[askCategory])
                          .filter((tag) => !askService.trim() || normalizeTextLower(tag).includes(normalizeTextLower(askService)))
                          .slice(0, 50)
                          .map((tag) => (
                            <TouchableOpacity
                              key={tag}
                              style={styles.categoryDropdownItem}
                              onPress={() => {
                                setAskService(tag);
                                setAskSubcategoryDropdownOpen(false);
                              }}
                            >
                              <Text style={styles.categoryDropdownItemText}>{tag}</Text>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    ) : null}
                  </View>
                </>
              ) : null}

              <Text style={styles.fieldLabel}>{t('ask.descriptionLabel')}</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={askDescription}
                onChangeText={setAskDescription}
                placeholder={t('ask.descriptionPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmitAsk}
              disabled={isSubmitting}
            >
              <Ionicons name="send-outline" size={18} color={colors.textInverse} />
              <Text style={styles.submitBtnText}>
                {isSubmitting ? t('common.loading', 'Saving...') : t('ask.submitAsk')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  putAskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  putAskBtnText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  filterColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'visible',
  },
  filterDropdownWrap: {
    flex: 1,
    minWidth: 140,
    position: 'relative',
  },
  filterDropdownWrapMobile: {
    flex: 0,
    width: '100%',
    minWidth: 0,
    position: 'relative',
    marginBottom: 0,
  },
  mobileSpacer: {
    height: spacing['3xl'],
  },
  filterLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterTriggerFocused: {
    borderColor: colors.primary,
  },
  filterInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    padding: 0,
    margin: 0,
  },
  filterPanel: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    ...shadows.md,
    overflow: 'hidden',
    zIndex: 999,
    ...(Platform.OS === 'android' ? { elevation: 20 } : {}),
  },
  filterPanelMobile: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    ...shadows.md,
    overflow: 'hidden',
    zIndex: 999,
    ...(Platform.OS === 'android' ? { elevation: 20 } : {}),
  },
  filterList: {
    maxHeight: 220,
  },
  filterOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterOptionSelected: {
    backgroundColor: colors.primaryFaded,
  },
  filterOptionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  filterOptionTextSelected: {
    color: colors.primary,
  },
  filterEmpty: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
  },
  clearFiltersBtnText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
  },
  modalBody: {
    maxHeight: 420,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  fieldLabel: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
    color: colors.text,
  },
  textArea: {
    minHeight: 110,
    marginBottom: spacing.lg,
  },
  categoryDropdownWrapper: {
    marginBottom: spacing.md,
  },
  categoryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categorySearchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  categoryDropdownList: {
    marginTop: spacing.sm,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  categoryDropdownItem: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  categoryDropdownItemText: {
    ...typography.body,
    color: colors.text,
  },
  submitBtn: {
    margin: spacing.xl,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.75,
  },
  submitBtnText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
});