import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../../theme';

interface AdminFormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

export const AdminFormField: React.FC<AdminFormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  numberOfLines = 1,
  icon,
  editable = true,
  keyboardType = 'default',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputError, multiline && styles.inputMultiline]}>
        {icon && (
          <Ionicons name={icon} size={18} color={colors.textTertiary} style={styles.icon} />
        )}
        <TextInput
          style={[styles.input, multiline && { height: numberOfLines * 24, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          keyboardType={keyboardType}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

interface AdminDropdownFieldProps {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onSelect: (key: string) => void;
  placeholder?: string;
  error?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export const AdminDropdownField: React.FC<AdminDropdownFieldProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select...',
  error,
  searchable = false,
  searchPlaceholder = 'Search...',
}) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const selectedLabel = options.find((o) => o.key === value)?.label || placeholder;
  const filteredOptions = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) =>
      `${option.label} ${option.key}`.toLowerCase().includes(query),
    );
  }, [options, search]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.inputWrapper, error && styles.inputError]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownText, !value && { color: colors.textTertiary }]}>
          {selectedLabel}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          {searchable ? (
            <View style={styles.dropdownSearchWrap}>
              <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
              <TextInput
                style={styles.dropdownSearchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          ) : null}
          <ScrollView
            style={styles.dropdownScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {filteredOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.dropdownItem, value === option.key && styles.dropdownItemSelected]}
                onPress={() => {
                  onSelect(option.key);
                  setSearch('');
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    value === option.key && styles.dropdownItemTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            {filteredOptions.length === 0 ? (
              <Text style={styles.dropdownEmptyText}>No options found</Text>
            ) : null}
          </ScrollView>
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

interface AdminMultiSelectDropdownFieldProps {
  label: string;
  values: string[];
  options: { key: string; label: string }[];
  onChange: (keys: string[]) => void;
  placeholder?: string;
  error?: string;
  selectAllLabel?: string;
}

export const AdminMultiSelectDropdownField: React.FC<AdminMultiSelectDropdownFieldProps> = ({
  label,
  values,
  options,
  onChange,
  placeholder = 'Select...',
  error,
  selectAllLabel = 'All Chapters',
}) => {
  const [open, setOpen] = React.useState(false);
  const selectedValues = React.useMemo(
    () => Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))),
    [values],
  );
  const optionKeys = React.useMemo(() => options.map((option) => option.key), [options]);
  const allSelected = optionKeys.length > 0 && optionKeys.every((key) => selectedValues.includes(key));
  const selectedLabels = options.filter((option) => selectedValues.includes(option.key)).map((option) => option.label);
  const selectedLabel = allSelected
    ? selectAllLabel
    : selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels[0]} +${selectedLabels.length - 1}`;

  const toggleKey = (key: string) => {
    if (selectedValues.includes(key)) {
      onChange(selectedValues.filter((value) => value !== key));
      return;
    }
    onChange([...selectedValues, key]);
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : optionKeys);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.inputWrapper, error && styles.inputError]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownText, selectedLabels.length === 0 && !allSelected && { color: colors.textTertiary }]}>
          {selectedLabel}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.dropdownScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={[styles.dropdownItem, allSelected && styles.dropdownItemSelected]}
              onPress={toggleAll}
              activeOpacity={0.7}
            >
              <View style={styles.multiSelectRow}>
                <Ionicons
                  name={allSelected ? 'checkbox-outline' : 'square-outline'}
                  size={20}
                  color={allSelected ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.dropdownItemText, allSelected && styles.dropdownItemTextSelected]}>
                  {selectAllLabel}
                </Text>
              </View>
            </TouchableOpacity>
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.key);
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                  onPress={() => toggleKey(option.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.multiSelectRow}>
                    <Ionicons
                      name={isSelected ? 'checkbox-outline' : 'square-outline'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.dropdownFooter}>
            <TouchableOpacity
              style={styles.dropdownDoneButton}
              onPress={() => setOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputMultiline: {
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  dropdownText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 196,
  },
  dropdownSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownSearchInput: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text,
    paddingVertical: spacing.sm + 2,
  },
  dropdownEmptyText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    padding: spacing.md,
    textAlign: 'center',
  },
  dropdownItem: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primaryFaded,
  },
  dropdownItemText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  multiSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: spacing.sm,
    alignItems: 'flex-end',
  },
  dropdownDoneButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  dropdownDoneText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
});
