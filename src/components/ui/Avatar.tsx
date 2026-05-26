import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { colors, typography, borderRadius } from '../../theme';
import { getInitials } from '../../utils/helpers';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const SIZES: Record<AvatarSize, number> = {
  xs: 32,
  sm: 40,
  md: 52,
  lg: 72,
  xl: 100,
};

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 36,
};

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '',
  size = 'md',
  style,
}) => {
  const dimension = SIZES[size];

  const containerStyle = [
    styles.container,
    {
      width: dimension,
      height: dimension,
      borderRadius: dimension / 2,
    },
    style,
  ];

  if (uri) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri }}
          style={[{ width: dimension, height: dimension, borderRadius: dimension / 2 }, styles.image]}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, styles.placeholder]}>
      <Text style={[styles.initials, { fontSize: FONT_SIZES[size] }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    backgroundColor: colors.surfaceVariant,
  },
  placeholder: {
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.primary,
    fontWeight: '600',
  },
});
