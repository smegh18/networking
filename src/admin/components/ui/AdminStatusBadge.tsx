import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../../theme';

interface AdminStatusBadgeProps {
  label: string;
  color: string;
}

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({ label, color }) => {
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    ...typography.captionMedium,
    fontSize: 12,
  },
});
