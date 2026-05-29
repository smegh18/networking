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
    <View style={[styles.card, compact && styles.compactCard, { borderLeftColor: color }, style]}>
      <View style={[styles.iconContainer, compact && styles.compactIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={compact ? 16 : 22} color={color} />
      </View>
      <Text style={[styles.value, compact && styles.compactValue]} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      <Text style={[styles.title, compact && styles.compactTitle]} numberOfLines={compact ? 3 : 2} adjustsFontSizeToFit>{title}</Text>
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
  compactCard: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderLeftWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
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
  compactIconContainer: {
    width: 24,
    height: 24,
    marginBottom: 4,
    borderRadius: borderRadius.sm,
  },
  value: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  compactValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 2,
    textAlign: 'center',
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  compactTitle: {
    fontSize: 8,
    lineHeight: 10,
    textAlign: 'center',
  },
});
