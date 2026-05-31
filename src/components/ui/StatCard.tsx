import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '../../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  style?: ViewStyle;
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  style,
  compact = false,
}) => {
  return (
    <View style={[styles.card, compact && styles.cardCompact, { borderLeftColor: color }, style]}>
      <View
        style={[
          styles.iconContainer,
          compact && styles.iconContainerCompact,
          { backgroundColor: color + '15' },
        ]}
      >
        <Ionicons name={icon} size={compact ? 16 : 22} color={color} />
      </View>
      <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 3,
    flex: 1,
    minWidth: 140,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardCompact: {
    padding: spacing.sm,
    borderLeftWidth: 2,
    minWidth: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconContainerCompact: {
    width: 28,
    height: 28,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  valueCompact: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  titleCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
});
