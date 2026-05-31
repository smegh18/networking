import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chip } from '../../../components/ui/Chip';
import { colors, typography, spacing, borderRadius } from '../../../theme';

interface AdminChipsInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const AdminChipsInput: React.FC<AdminChipsInputProps> = ({
  label,
  values,
  onChange,
  placeholder = 'Type and press Enter to add',
}) => {
  const [inputText, setInputText] = useState('');

  const addChip = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
  };

  const removeChip = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const parts = inputText.split(/[,\n]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      const newValues = [...values];
      parts.forEach((p) => {
        if (p && !newValues.includes(p)) newValues.push(p);
      });
      onChange(newValues);
      setInputText('');
    } else {
      addChip(inputText);
      setInputText('');
    }
  };

  const handleChangeText = (text: string) => {
    if (text.includes(',')) {
      const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        const newValues = [...values];
        parts.forEach((p) => {
          if (p && !newValues.includes(p)) newValues.push(p);
        });
        onChange(newValues);
        setInputText('');
      } else {
        setInputText(text);
      }
    } else {
      setInputText(text);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipsWrapper}>
        {values.map((v, i) => (
          <Chip key={`${v}-${i}`} label={v} onRemove={() => removeChip(i)} />
        ))}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            onSubmitEditing={handleSubmit}
            onBlur={handleSubmit}
            returnKeyType="done"
          />
        </View>
      </View>
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
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  inputRow: {
    flex: 1,
    minWidth: 120,
  },
  input: {
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
});
