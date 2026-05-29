import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing } from '../../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  onRemove,
  icon,
  style,
}) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.chip, selected && styles.chipSelected, style]}
      {...(onPress && { onPress, activeOpacity: 0.7 })}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.textInverse : colors.primary}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name="close-circle"
            size={16}
            color={selected ? colors.textInverse : colors.textTertiary}
            style={styles.removeIcon}
          />
        </TouchableOpacity>
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryFaded,
    borderWidth: 1,
    borderColor: colors.primaryFaded,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  labelSelected: {
    color: colors.textInverse,
  },
  icon: {
    marginRight: spacing.xs,
  },
  removeIcon: {
    marginLeft: spacing.xs,
  },
});
