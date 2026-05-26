import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Pressable,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { colors, typography, borderRadius, spacing, shadows, layout } from '../../theme';
import { Ad } from '../../types';

interface AdCarouselProps {
  ads: Ad[];
  onAdPress?: (ad: Ad) => void;
}

export const AdCarousel: React.FC<AdCarouselProps> = ({ ads, onAdPress }) => {
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const currentIndexRef = useRef(0);
  const { width } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  const isWeb = Platform.OS === 'web';
  const isWebWide = isWeb && width > 900;
  const CARD_WIDTH = width - layout.screenPadding * 2;
  const CARD_HEIGHT = isWebWide ? 220 : 180;
  const CARD_SPACING = isWeb ? 0 : spacing.md;

  // Animate slide position when activeIndex changes (web only)
  useEffect(() => {
    if (isWeb && containerWidth > 0) {
      Animated.spring(slideAnim, {
        toValue: -activeIndex * containerWidth,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    }
  }, [activeIndex, isWeb, slideAnim, containerWidth]);

  // Auto-advance timer
  useEffect(() => {
    if (ads.length <= 1 || paused) return;
    const timer = setInterval(() => {
      if (isWeb) {
        // On web, just update the index (animation handled by other effect)
        const nextIndex = (activeIndex + 1) % ads.length;
        setActiveIndex(nextIndex);
      } else {
        // On mobile, scroll to next card
        currentIndexRef.current = (currentIndexRef.current + 1) % ads.length;
        const scrollOffset = currentIndexRef.current * (CARD_WIDTH + CARD_SPACING);
        flatListRef.current?.scrollToOffset({ offset: scrollOffset, animated: true });
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [ads.length, CARD_WIDTH, CARD_SPACING, isWeb, activeIndex, paused]);

  if (ads.length === 0) return null;

  const goToIndex = (index: number) => {
    if (index < 0 || index >= ads.length) return;
    setActiveIndex(index);
    currentIndexRef.current = index;
    if (!isWeb) {
      const scrollOffset = index * (CARD_WIDTH + CARD_SPACING);
      flatListRef.current?.scrollToOffset({ offset: scrollOffset, animated: true });
    }
  };

  const renderItem = ({ item }: { item: Ad }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { width: isWeb ? '100%' : CARD_WIDTH, height: CARD_HEIGHT },
        isWeb ? styles.webCard : styles.mobileCard,
      ]}
      activeOpacity={0.9}
      onPress={() => onAdPress?.(item)}
    >
      <Image
        source={{ uri: item.imageURL || 'https://via.placeholder.com/400x200/2563EB/FFFFFF?text=Business+Ad' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <Text style={styles.adTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.adBusiness} numberOfLines={1}>{item.businessName}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isWeb) {
    // Web: Show sliding carousel with animation
    return (
      <View style={[styles.container, styles.webContainer]}>
        <View
          style={styles.carouselWrapper}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[
              styles.webSlider,
              {
                transform: [
                  {
                    translateX: slideAnim,
                  },
                ],
              },
            ]}
          >
            {ads.map((ad, index) => (
              <View key={ad.id} style={[styles.webSlide, { width: containerWidth }]}>
                {renderItem({ item: ad })}
              </View>
            ))}
          </Animated.View>
        </View>
        {ads.length > 1 && (
          <View style={styles.dots}>
            {ads.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => goToIndex(index)}
                onHoverIn={() => setPaused(true)}
                onHoverOut={() => setPaused(false)}
                hitSlop={10}
                style={styles.dotHitbox}
              >
                <View style={[styles.dot, index === activeIndex && styles.dotActive]} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Mobile: Scrollable carousel
  return (
    <View style={[styles.container, styles.mobileContainer]}>
      <FlatList
        ref={flatListRef}
        data={ads}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
          setActiveIndex(index);
          currentIndexRef.current = index;
        }}
      />
      {ads.length > 1 && (
        <View style={styles.dots}>
          {ads.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => goToIndex(index)}
              hitSlop={10}
              style={styles.dotHitbox}
            >
              <View style={[styles.dot, index === activeIndex && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  mobileContainer: {
    paddingHorizontal: layout.screenPadding,
  },
  webContainer: {
    alignItems: 'stretch',
  },
  carouselWrapper: {
    overflow: 'hidden',
  },
  webSlider: {
    flexDirection: 'row',
  },
  webSlide: {
    flexShrink: 0,
  },
  listContent: {
    paddingRight: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginRight: spacing.md,
    ...shadows.md,
  },
  webCard: {
    marginRight: 0,
  },
  mobileCard: {
    marginRight: spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryFaded,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingTop: spacing['3xl'],
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  adTitle: {
    ...typography.bodySemiBold,
    color: colors.textInverse,
  },
  adBusiness: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  dotHitbox: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
});
