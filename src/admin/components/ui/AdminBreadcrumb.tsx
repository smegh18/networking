import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../../theme';

export type AdminBreadcrumbItem = {
  label: string;
  /** When set, segment is tappable (except the last item, which is always shown as current). */
  onPress?: () => void;
};

type AdminBreadcrumbProps = {
  items: AdminBreadcrumbItem[];
};

export const AdminBreadcrumb: React.FC<AdminBreadcrumbProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="grid-outline" size={16} color={colors.textTertiary} style={styles.homeIcon} />
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isLink = Boolean(item.onPress) && !isLast;

        return (
          <View key={`${item.label}-${index}`} style={styles.segment}>
            {index > 0 ? (
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.textTertiary}
                style={styles.separator}
              />
            ) : null}
            {isLink ? (
              <TouchableOpacity onPress={item.onPress} activeOpacity={0.7} hitSlop={8}>
                <Text style={styles.link}>{item.label}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.current, isLast && styles.currentLast]} numberOfLines={1}>
                {item.label}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  homeIcon: {
    marginRight: spacing.xs,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  separator: {
    marginHorizontal: spacing.xs,
  },
  link: {
    ...typography.bodySmallMedium,
    color: colors.primary,
  },
  current: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  currentLast: {
    ...typography.bodySmallMedium,
    color: colors.text,
    maxWidth: 280,
  },
});
