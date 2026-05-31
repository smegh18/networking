import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput as RNTextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDropdownMaxHeight } from '../../hooks/useKeyboardHeight';
import { spacing, layout, colors, typography, borderRadius, shadows } from '../../theme';
import { normalizeText, normalizeTextLower, normalizeStringArray } from '../../utils/helpers';


interface FilterBarProps {
  chapters: { id: string; name: string }[];
  selectedChapter: string;
  onChapterSelect: (id: string) => void;
  locations: string[];
  selectedLocation: string;
  onLocationSelect: (loc: string) => void;
  categories?: string[];
  selectedCategory?: string;
  onCategorySelect?: (cat: string) => void;
  padded?: boolean;
}

type FilterKey = 'chapter' | 'location' | 'category';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  allLabel: string;
  searchPlaceholder: string;
  options: FilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onRequestClose: () => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  title,
  icon,
  allLabel,
  searchPlaceholder,
  options,
  selectedValue,
  onSelect,
  searchValue,
  onSearchChange,
  isOpen,
  onToggle,
  onRequestClose,
}) => {
  const dropdownMaxHeight = useDropdownMaxHeight(220);
  const selectedLabel = selectedValue
    ? normalizeText(options.find((opt) => opt.value === selectedValue)?.label || '') || allLabel
    : allLabel;

  const filteredOptions = useMemo(() => {
    const q = normalizeTextLower(searchValue);
    if (!q) return options;
    return options.filter((opt) => normalizeTextLower(opt.label).includes(q));

  }, [options, searchValue]);

  const displayValue = isOpen ? searchValue : selectedLabel;
  const showPlaceholder = !selectedValue && !isOpen;

  return (
    <View style={styles.dropdownWrap}>
      <Text style={styles.dropdownTitle}>{title}</Text>
      <View style={[styles.dropdownTrigger, isOpen && styles.dropdownTriggerFocused]}>
        <Ionicons name={icon} size={18} color={colors.textTertiary} />
        <RNTextInput
          style={styles.dropdownSearchInput}
          value={displayValue}
          onChangeText={(text) => {
            onSearchChange(text);
            if (!isOpen) onToggle();
          }}
          onFocus={() => onToggle()}
          onBlur={() => setTimeout(onRequestClose, Platform.OS === 'android' ? 300 : 180)}
          placeholder={showPlaceholder ? allLabel : searchPlaceholder}
          placeholderTextColor={colors.textTertiary}
        />
        {searchValue.trim().length > 0 ? (
          <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textTertiary}
          />
        )}
      </View>

      {isOpen && (
        <View style={styles.dropdownPanel}>
          <ScrollView style={[styles.optionsList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={[styles.optionRow, !selectedValue && styles.optionRowSelected]}
              onPress={() => onSelect('')}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, !selectedValue && styles.optionTextSelected]}>{allLabel}</Text>
              {!selectedValue ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </TouchableOpacity>

            {filteredOptions.map((opt) => {
              const isSelected = selectedValue === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => onSelect(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{opt.label}</Text>
                  {isSelected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}

            {filteredOptions.length === 0 ? (
              <Text style={styles.emptyText}>No matching options</Text>
            ) : null}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export const FilterBar: React.FC<FilterBarProps> = ({
  chapters,
  selectedChapter,
  onChapterSelect,
  locations,
  selectedLocation,
  onLocationSelect,
  categories,
  selectedCategory,
  onCategorySelect,
  padded = true,
}) => {
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [chapterSearch, setChapterSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const chapterOptions = useMemo(
    () =>
      chapters
        .map((ch) => ({ value: ch.id, label: normalizeText(ch.name) }))
        .filter((ch) => !!ch.value && !!ch.label),
    [chapters],
  );
  const locationOptions = useMemo(
    () => normalizeStringArray(locations).map((loc) => ({ value: loc, label: loc })),
    [locations],
  );
  const categoryOptions = useMemo(
    () => normalizeStringArray(categories).map((cat) => ({ value: cat, label: cat })),

    [categories],
  );

  const hasAnyFilter = !!selectedChapter || !!selectedLocation || !!selectedCategory;

  return (
    <View style={[styles.container, !padded && styles.containerNoPad]}>
      <FilterDropdown
        title="Chapter"
        icon="people-outline"
        allLabel="All Chapters"
        searchPlaceholder="Search chapter"
        options={chapterOptions}
        selectedValue={selectedChapter}
        onSelect={(value) => {
          onChapterSelect(value);
          setChapterSearch('');
          setOpenFilter(null);
        }}
        searchValue={chapterSearch}
        onSearchChange={setChapterSearch}
        isOpen={openFilter === 'chapter'}
        onToggle={() => setOpenFilter((prev) => (prev === 'chapter' ? null : 'chapter'))}
        onRequestClose={() => setOpenFilter(null)}
      />

      <FilterDropdown
        title="Location"
        icon="location-outline"
        allLabel="All Locations"
        searchPlaceholder="Search location"
        options={locationOptions}
        selectedValue={selectedLocation}
        onSelect={(value) => {
          onLocationSelect(value);
          setLocationSearch('');
          setOpenFilter(null);
        }}
        searchValue={locationSearch}
        onSearchChange={setLocationSearch}
        isOpen={openFilter === 'location'}
        onToggle={() => setOpenFilter((prev) => (prev === 'location' ? null : 'location'))}
        onRequestClose={() => setOpenFilter(null)}
      />

      {onCategorySelect ? (
        <FilterDropdown
          title="Category"
          icon="briefcase-outline"
          allLabel="All Categories"
          searchPlaceholder="Search category"
          options={categoryOptions}
          selectedValue={selectedCategory || ''}
          onSelect={(value) => {
            onCategorySelect(value);
            setCategorySearch('');
            setOpenFilter(null);
          }}
          searchValue={categorySearch}
          onSearchChange={setCategorySearch}
          isOpen={openFilter === 'category'}
          onToggle={() => setOpenFilter((prev) => (prev === 'category' ? null : 'category'))}
          onRequestClose={() => setOpenFilter(null)}
        />
      ) : null}

      {hasAnyFilter ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            onChapterSelect('');
            onLocationSelect('');
            onCategorySelect?.('');
          }}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          <Text style={styles.clearButtonText}>Clear All Filters</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
  containerNoPad: {
    paddingHorizontal: 0,
  },
  dropdownWrap: {
    zIndex: 5,
  },
  dropdownTitle: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dropdownTriggerFocused: {
    borderColor: colors.primary,
  },
  dropdownSearchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    padding: 0,
    margin: 0,
  },
  dropdownPanel: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    ...shadows.md,
    overflow: 'hidden',
  },
  optionsList: {
    maxHeight: 220,
  },
  optionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  optionRowSelected: {
    backgroundColor: colors.primaryFaded,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  optionTextSelected: {
    color: colors.primary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
  },
  clearButtonText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
});
