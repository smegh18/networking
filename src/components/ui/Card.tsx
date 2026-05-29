import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadows, layout } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  padded = true,
  elevated = true,
}) => {
  const cardStyles = [
    styles.card,
    padded && styles.padded,
    elevated && shadows.md,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyles} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  padded: {
    padding: layout.cardPadding,
  },
});
