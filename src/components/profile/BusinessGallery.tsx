import React from 'react';
import { View, Image, StyleSheet, FlatList, Dimensions, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../../theme';

const IMAGE_SIZE = (Dimensions.get('window').width - 48 - 16) / 3;

interface BusinessGalleryProps {
  photos: string[];
  onAddPhoto?: () => void;
  editable?: boolean;
  onPhotoPress?: (index: number) => void;
}

export const BusinessGallery: React.FC<BusinessGalleryProps> = ({
  photos,
  onAddPhoto,
  editable = false,
  onPhotoPress,
}) => {
  const renderPhoto = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      onPress={() => onPhotoPress?.(index)}
      activeOpacity={0.8}
      style={styles.photoContainer}
    >
      <Image source={{ uri: item }} style={styles.photo} resizeMode="cover" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onPhotoPress?.(index)}
            activeOpacity={0.8}
            style={styles.photoContainer}
          >
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          </TouchableOpacity>
        ))}
        {editable && photos.length < 6 && (
          <TouchableOpacity style={styles.addButton} onPress={onAddPhoto}>
            <Ionicons name="add" size={32} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceVariant,
  },
  addButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },
});
