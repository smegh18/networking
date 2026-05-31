import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';

interface AdminKPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
}

export const AdminKPICard: React.FC<AdminKPICardProps> = ({
  title,
  value,
  icon,
  iconColor = colors.primary,
  iconBg = colors.primaryFaded,
}) => {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 160,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
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
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
