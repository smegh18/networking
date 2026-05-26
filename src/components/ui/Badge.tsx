import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, borderRadius, spacing } from '../../theme';

interface BadgeProps {
  count: number;
  maxCount?: number;
  size?: 'sm' | 'md';
  color?: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  count,
  maxCount = 99,
  size = 'sm',
  color = colors.error,
  style,
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : `${count}`;
  const isSm = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: color, minWidth: isSm ? 18 : 22, height: isSm ? 18 : 22 }, style]}>
      <Text style={[styles.text, isSm && styles.textSm]}>{displayCount}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  text: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 10,
  },
});
