import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View, Dimensions, Platform, Image } from 'react-native';
import { colors } from '../../theme';


type Props = {
  name?: string;
};

export const AppSplash: React.FC<Props> = ({ name = 'Brahmin Connect' }) => {
  const { width } = useWindowDimensions();
  const scale = useRef(new Animated.Value(4)).current;

  const logoSource = useMemo(() => require('../../../assets/Logo tagline.png'), []);
  const logoWidth = Math.min(320, Math.floor(width * 0.8));
  const logoHeight = logoWidth;

  useEffect(() => {
    const animation = Animated.timing(scale, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [scale]);


  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Animated.Image
          source={logoSource}
          style={[styles.logo, { width: logoWidth, height: logoHeight, transform: [{ scale }] }]}

          resizeMode="contain"
          accessibilityLabel={`${name} logo`}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f2f2f2',

    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
  },
  logo: {
    borderRadius: 35,

  },
});
