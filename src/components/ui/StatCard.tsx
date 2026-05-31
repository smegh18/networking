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

}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  style,
}) => {
  return (
    <View style={[styles.card, { borderLeftColor: color }, style]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>

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

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  value: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  title: {
    ...typography.caption,
    color: colors.textSecondary,
  },

});
