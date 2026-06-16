import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Linking, FlatList, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Section } from '../../components/layout/Section';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { SocialLinks } from '../../components/profile/SocialLinks';
import { TagsList } from '../../components/profile/TagsList';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { getChapterName } from '../../utils/chapter';
import { openWhatsApp } from '../../utils/helpers';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { NetworkStackParamList, User, Chapter } from '../../types';

type Props = StackScreenProps<NetworkStackParamList, 'BusinessProfile'>;

const BusinessProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { userId } = route.params;
  const { items: users } = useRealtimeCollection<User>('users', 'uid');
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
  const user = useMemo(() => users.find((item) => item.uid === userId) ?? null, [userId, users]);
  const chapterName = useMemo(
    () => (user ? getChapterName(user.chapterId, chapters) : undefined),
    [user?.chapterId, chapters],
  );

  const handleScheduleMeeting = () => {
    const tabNav = navigation.getParent();
    if (!tabNav || !user?.uid) return;
    (tabNav as any).navigate('DashboardTab', {
      screen: 'ScheduleMeeting',
      params: { userId: user.uid },
    });
  };

  const handleCall = async () => {
    const phone = user?.phone?.trim();
    if (!phone) return;
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert(t('common.error', 'Error'), t('network.callFailed', 'Unable to place call'));
    }
  };

  const handleWhatsApp = async () => {
    const phone = user?.socialLinks?.whatsapp || user?.phone;
    if (!phone) return;
    try {
      await Linking.openURL(openWhatsApp(phone));
    } catch {
      Alert.alert(t('common.error', 'Error'), t('network.whatsAppFailed', 'Unable to open WhatsApp'));
    }
  };

  const handleSaveNumber = () => {
    Alert.alert(
      t('profile.contactSaved', 'Contact Saved'),
      t('profile.contactSavedMessage', 'Business contact has been saved.'),
    );
  };

  const renderPhotoCarousel = () => {
    if (!user?.businessPhotos?.length) {
      return <Text style={styles.emptyPhotosText}>{t('profile.noPhotos', 'No business photos yet')}</Text>;
    }
    return (
      <FlatList
        data={user.businessPhotos}
        keyExtractor={(_, index) => `${user.uid}_photo_${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        renderItem={({ item }) => (
          <View style={styles.carouselItem}>
            <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
          </View>
        )}
      />
    );
  };

  if (!user) {
    return (
      <ScreenWrapper>
        <Header title={t('network.businessProfile')} onBack={() => navigation.goBack()} />
        <EmptyState icon="person-outline" title={t('network.noMembers')} message={t('network.noMembersMessage')} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title={t('network.businessProfile')} onBack={() => navigation.goBack()} />

      <ProfileHeader user={user} chapterName={chapterName} />

      <Section title={t('profile.businessInfo')}>
        <Card>
          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={18} color={colors.textTertiary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.category')}</Text>
              <Text style={styles.infoValue}>{user.businessCategory || '-'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.textTertiary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.location', 'Location')}</Text>
              <Text style={styles.infoValue}>
                {[user.location?.city, user.location?.state].filter(Boolean).join(', ') || '-'}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="home-outline" size={18} color={colors.textTertiary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.businessAddress', 'Business Address')}</Text>
              <Text style={styles.infoValue}>{user.businessAddress || '-'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.descriptionLabel}>{t('profile.businessDescription')}</Text>
          <Text style={styles.description}>
            {user.businessDescription || t('profile.noDescription', 'No description added yet')}
          </Text>
        </Card>
      </Section>

      {user.services && user.services.length > 0 ? (
        <Section title={t('profile.servicesOffered')}>
          <TagsList tags={user.services} />
        </Section>
      ) : null}

      <Section title={t('profile.tags')}>
        <TagsList tags={user.businessTags || []} />
      </Section>

      <Section title={t('profile.businessPhotos')}>
        {renderPhotoCarousel()}
      </Section>

      <Section title={t('profile.socialLinks')}>
        <SocialLinks
          links={user.socialLinks}
          businessAddress={user.businessAddress}
          businessArea={user.businessArea}
          location={user.location}
        />
      </Section>

      <Section title={t('network.connect')}>
        <View style={styles.connectGrid}>
          <Button
            title={t('dashboard.scheduleMeeting', 'Schedule B2B')}
            onPress={handleScheduleMeeting}
            icon="calendar-outline"
            size="md"
            style={styles.connectButton}
          />
          <Button
            title={t('network.call', 'Call')}
            onPress={handleCall}
            icon="call-outline"
            variant="outline"
            size="md"
            style={styles.connectButton}
          />
          <Button
            title={t('network.whatsapp', 'WhatsApp')}
            onPress={handleWhatsApp}
            icon="logo-whatsapp"
            variant="outline"
            size="md"
            style={styles.connectButton}
          />
          <Button
            title={t('network.saveNumber', 'Save Number')}
            onPress={handleSaveNumber}
            icon="person-add-outline"
            variant="outline"
            size="md"
            style={styles.connectButton}
          />
        </View>
      </Section>
    </ScreenWrapper>
  );
};

export default BusinessProfileScreen;

const styles = StyleSheet.create({
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  infoContent: {
    marginLeft: spacing.lg,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  descriptionLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  connectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  connectButton: {
    minWidth: 180,
    flexGrow: 1,
  },
  carouselContent: {
    paddingRight: spacing.md,
  },
  carouselItem: {
    width: 300,
    height: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: colors.surfaceVariant,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  emptyPhotosText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});
