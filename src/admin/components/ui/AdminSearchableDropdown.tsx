import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../../theme';


interface AdminSearchableDropdownProps {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onSelect: (key: string) => void;
  placeholder?: string;
  error?: string;
}

export const AdminSearchableDropdown: React.FC<AdminSearchableDropdownProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Search and select...',
  error,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLabel = options.find((o) => o.key === value)?.label || placeholder;

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.key.toLowerCase().includes(q),

    );
  }, [options, search]);

  const handleSelect = (key: string) => {
    onSelect(key);
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.inputWrapper, error && styles.inputError]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownText, !value && { color: colors.textTertiary }]} numberOfLines={1}>
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
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={18} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search users..."
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </View>
          <ScrollView
            style={styles.dropdownScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {filteredOptions.length === 0 ? (
              <Text style={styles.emptyText}>No matches found</Text>
            ) : (
              filteredOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.dropdownItem, value === option.key && styles.dropdownItemSelected]}
                  onPress={() => handleSelect(option.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === option.key && styles.dropdownItemTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
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
    maxHeight: 260,
    overflow: 'hidden',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    padding: 0,
  },
  dropdownScroll: {
    maxHeight: 200,
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
  emptyText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    padding: spacing.lg,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
