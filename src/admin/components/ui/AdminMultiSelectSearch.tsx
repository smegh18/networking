import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from '../../../components/ui/Chip';
import { colors, typography, spacing, borderRadius } from '../../../theme';
import { normalizeTextLower } from '../../../utils/helpers';

export type SearchSuggestion = {
  key: string;
  label: string;
  type: 'city' | 'state' | 'chapter';
};

interface AdminMultiSelectSearchProps {
  label: string;
  selectedItems: SearchSuggestion[];
  onItemsChange: (items: SearchSuggestion[]) => void;
  suggestions: SearchSuggestion[];
  placeholder?: string;
}

export const AdminMultiSelectSearch: React.FC<AdminMultiSelectSearchProps> = ({
  label,
  selectedItems,
  onItemsChange,
  suggestions,
  placeholder = 'Search city, state or chapter...',
}) => {
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (!inputText.trim()) return [];
    const q = normalizeTextLower(inputText);
    return suggestions
      .filter(
        (s) =>
          normalizeTextLower(s.label).includes(q) &&
          !selectedItems.some((item) => item.key === s.key && item.type === s.type)
      )
      .slice(0, 10);
  }, [suggestions, inputText, selectedItems]);

  const handleSelectItem = (item: SearchSuggestion) => {
    onItemsChange([...selectedItems, item]);
    setInputText('');
  };

  const handleRemoveItem = (index: number) => {
    onItemsChange(selectedItems.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
        <View style={styles.chipsWrapper}>
          {selectedItems.map((item, index) => (
            <Chip
              key={`${item.type}-${item.key}`}
              label={`${item.label} (${item.type})`}
              onRemove={() => handleRemoveItem(index)}
              style={styles.chipOverride}
            />
          ))}
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={selectedItems.length === 0 ? placeholder : ''}
            placeholderTextColor={colors.textTertiary}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Increased delay to ensure tap registers on all devices
              setTimeout(() => setIsFocused(false), 300);
            }}
          />
        </View>
      </View>

      {isFocused && filteredSuggestions.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            style={styles.dropdownScroll}
          >
            {filteredSuggestions.map((item) => (
              <TouchableOpacity
                key={`${item.type}-${item.key}`}
                style={styles.dropdownItem}
                onPress={() => handleSelectItem(item)}
                activeOpacity={0.6}
              >
                <View style={styles.suggestionRow} pointerEvents="none">
                  <Ionicons
                    name={
                      item.type === 'city'
                        ? 'location-outline'
                        : item.type === 'state'
                        ? 'map-outline'
                        : 'business-outline'
                    }
                    size={16}
                    color={colors.textTertiary}
                  />
                  <Text style={styles.suggestionText}>{item.label}</Text>
                  <Text style={styles.suggestionType}>{item.type}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    position: 'relative',
    zIndex: 100,
  },
  label: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  chipOverride: {
    marginBottom: 4,
    marginTop: 4,
    marginRight: 6,
  },
  input: {
    flex: 1,
    minWidth: 120,
    ...typography.body,
    color: colors.text,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    height: 40,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginTop: 4,
    maxHeight: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 250,
  },
  dropdownItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text,
  },
  suggestionType: {
    ...typography.caption,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
