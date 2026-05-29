import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View, Dimensions, Platform, Image } from 'react-native';
import { colors } from '../../theme';

type Props = {
  name?: string;
};

export const AppSplash: React.FC<Props> = ({ name = 'Brahmin Connect' }) => {
  const { width: hookWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  
  // Use a stable width for the splash to prevent ANY jumping
  const width = isWeb 
    ? (Dimensions.get('window').width || 1200) 
    : (hookWidth > 0 ? hookWidth : Dimensions.get('window').width || 375);

  const logoSource = useMemo(() => require('../../../assets/Logo tagline.png'), []);
  // Use a fixed size for the splash logo to match the Welcome screen's logo visual weight
  const logoSize = isWeb ? 180 : Math.min(240, width * 0.6);

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Image
          source={logoSource}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
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
    backgroundColor: '#F8FAFC', // Match colors.background EXACTLY
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
  },
  logo: {
    // Optional: add a slight rounding if the asset isn't perfectly circular
    borderRadius: 20,
  },
});
