import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, shadows } from '../../../theme';

interface AdminHeaderProps {
  title: string;
  onMenuPress?: () => void;
  showMenuButton?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  onMenuPress,
  showMenuButton = true,
  showBackButton,
  onBack,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showMenuButton && onMenuPress && (
          <TouchableOpacity style={styles.iconButton} onPress={onMenuPress} activeOpacity={0.7}>
            <Ionicons name="menu-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        {showBackButton && onBack && (
          <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.right}>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: spacing.md,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    gap: spacing.xs,
  },
  adminBadgeText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
});
