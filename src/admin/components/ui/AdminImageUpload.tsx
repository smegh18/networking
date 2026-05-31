import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius } from '../../../theme';

interface AdminImageUploadProps {
  label?: string;
  /** URI to display - Firebase Storage URL or local file URI from picker */
  imageSource: string;
  /** Callback when user selects a new image - receives local file URI */
  onImageSelected: (localUri: string) => void;
  /** Callback when user removes the image */
  onRemove?: () => void;
  /** Whether an upload is in progress */
  uploading?: boolean;
}

export const AdminImageUpload: React.FC<AdminImageUploadProps> = ({
  label = 'Image',
  imageSource,
  onImageSelected,
  onRemove,
  uploading = false,
}) => {
  const hasImage = !!imageSource;

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.content}>
        {hasImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageSource }} style={styles.preview} resizeMode="cover" />
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color={colors.textInverse} />
                <Text style={styles.uploadText}>Uploading...</Text>
              </View>
            )}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePickImage}
                disabled={uploading}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={18} color={colors.textInverse} />
                <Text style={styles.actionText}>Replace</Text>
              </TouchableOpacity>
              {onRemove && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={onRemove}
                  disabled={uploading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textInverse} />
                  <Text style={styles.actionText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.placeholder}
            onPress={handlePickImage}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.placeholderText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.placeholderText}>Tap to upload image</Text>
                <Text style={styles.placeholderHint}>Images are saved to Firebase Storage</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  content: {
    minHeight: 160,
  },
  previewContainer: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
  },
  preview: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceVariant,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    ...typography.bodySmall,
    color: colors.textInverse,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  removeButton: {
    backgroundColor: colors.error,
  },
  actionText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
  placeholder: {
    flex: 1,
    minHeight: 160,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  placeholderText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  placeholderHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
