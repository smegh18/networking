import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import type { ProfileStackParamList } from '../../types';

type Props = StackScreenProps<ProfileStackParamList, 'BusinessPhotos'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_MARGIN = spacing.sm;
const IMAGES_PER_ROW = 3;
const IMAGE_SIZE = (SCREEN_WIDTH - layout.screenPadding * 2 - IMAGE_MARGIN * (IMAGES_PER_ROW - 1)) / IMAGES_PER_ROW;

const MAX_PHOTOS = 8;

const BusinessPhotosScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const photos = useMemo(() => user?.businessPhotos ?? [], [user?.businessPhotos]);
  const gstCerts = useMemo(() => user?.gstCertificates ?? [], [user?.gstCertificates]);

  const updateField = async (field: 'businessPhotos' | 'gstCertificates', nextArray: string[]) => {
    if (!user?.uid) return;
    await update(ref(rtdb, `users/${user.uid}`), {
      [field]: nextArray,
      updatedAt: new Date().toISOString(),
    });
    if (user) {
      setUser({ ...user, [field]: nextArray });
    }
  };

  const handleAddPhoto = (type: 'businessPhotos' | 'gstCertificates') => {
    Alert.alert(
      t('photos.addPhoto'),
      t('photos.addPhotoMessage', 'Upload integration can be connected here.'),
    );
  };

  const handleDeletePhoto = (type: 'businessPhotos' | 'gstCertificates', index: number) => {
    Alert.alert(
      t('photos.deletePhoto'),
      t('photos.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const currentArray = type === 'businessPhotos' ? photos : gstCerts;
            const nextArray = currentArray.filter((_, i) => i !== index);
            try {
              await updateField(type, nextArray);
            } catch {
              Alert.alert(t('common.error'), t('photos.deleteFailed', 'Failed to delete photo'));
            }
          },
        },
      ],
    );
  };

  if (!user) {
    return (
      <ScreenWrapper uniformLayout>
        <Header title={t('profile.uploads', 'Uploads')} onBack={() => navigation.goBack()} />
        <Text style={styles.emptyText}>{t('profile.noProfileData', 'No profile data found')}</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper uniformLayout>
      <Header title={t('profile.uploads', 'Uploads')} onBack={() => navigation.goBack()} />

      <Text style={styles.sectionTitle}>{t('profile.businessPhotos')}</Text>

      <Text style={styles.subtitle}>
        {t('photos.subtitle', { count: photos.length, max: MAX_PHOTOS })}
      </Text>

      {photos.length > 0 ? (
        <View style={styles.grid}>
          {photos.map((photo, index) => (
            <View key={`photo-${index}`} style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePhoto('businessPhotos', index)}>
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          {photos.length < MAX_PHOTOS ? (
            <TouchableOpacity style={styles.addPhotoCell} onPress={() => handleAddPhoto('businessPhotos')}>
              <Ionicons name="add-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.addPhotoText}>{t('photos.add')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <EmptyState
          icon="images-outline"
          title={t('photos.noPhotos')}
          message={t('photos.noPhotosMessage')}
          actionLabel={t('photos.addFirst')}
          onAction={() => handleAddPhoto('businessPhotos')}
        />
      )}

      {photos.length > 0 && photos.length < MAX_PHOTOS ? (
        <Button
          title={t('photos.addPhoto')}
          onPress={() => handleAddPhoto('businessPhotos')}
          icon="camera-outline"
          fullWidth
          style={styles.addButton}
        />
      ) : null}

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>{t('profile.gstCertificates', 'GST Certificates')}</Text>
      <Text style={styles.subtitle}>
        {t('photos.subtitle', { count: gstCerts.length, max: MAX_PHOTOS })}
      </Text>

      {gstCerts.length > 0 ? (
        <View style={styles.grid}>
          {gstCerts.map((cert, index) => (
            <View key={`cert-${index}`} style={styles.photoContainer}>
              <Image source={{ uri: cert }} style={styles.photo} resizeMode="cover" />
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePhoto('gstCertificates', index)}>
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          {gstCerts.length < MAX_PHOTOS ? (
            <TouchableOpacity style={styles.addPhotoCell} onPress={() => handleAddPhoto('gstCertificates')}>
              <Ionicons name="add-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.addPhotoText}>{t('photos.add')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <EmptyState
          icon="document-text-outline"
          title={t('photos.noCertificates', 'No Certificates')}
          message={t('photos.noCertificatesMessage', 'Upload your GST certificates here.')}
          actionLabel={t('photos.addFirstCertificate', 'Add Certificate')}
          onAction={() => handleAddPhoto('gstCertificates')}
        />
      )}

      {gstCerts.length > 0 && gstCerts.length < MAX_PHOTOS ? (
        <Button
          title={t('photos.addCertificate', 'Add Certificate')}
          onPress={() => handleAddPhoto('gstCertificates')}
          icon="camera-outline"
          fullWidth
          style={styles.addButton}
        />
      ) : null}


    </ScreenWrapper>
  );
};

export default BusinessPhotosScreen;

const styles = StyleSheet.create({
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IMAGE_MARGIN,
  },
  photoContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceVariant,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 2,
    ...shadows.sm,
  },
  addPhotoCell: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  addPhotoText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  addButton: {
    marginTop: spacing['2xl'],
    marginBottom: spacing['3xl'],
  },
});
