import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, layout } from '../../theme';

interface SectionProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Section: React.FC<SectionProps> = ({
  title,
  actionLabel,
  onAction,
  children,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction} style={styles.action}>
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing['3xl'],
    paddingHorizontal: layout.screenPadding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    ...typography.bodySmallMedium,
    color: colors.primary,
  },
});
