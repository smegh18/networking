import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { MemberProfileContent } from '../../components/profile/MemberProfileContent';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing } from '../../theme';
import type { Ask, ProfileStackParamList, Chapter, Event, Meeting, Referral, VisitorInvite, Business } from '../../types';

type Props = StackScreenProps<ProfileStackParamList, 'Profile'>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
  const { items: events } = useRealtimeCollection<Event>('events');
  const { items: meetings } = useRealtimeCollection<Meeting>('meetings');
  const { items: referrals } = useRealtimeCollection<Referral>('referrals');
  const { items: asks } = useRealtimeCollection<Ask>('asks');
  const { items: visitorInvites } = useRealtimeCollection<VisitorInvite>('visitorInvites');
  const { items: businessEntries } = useRealtimeCollection<Business>('business');
  const chapterName = useMemo(
    () => (user?.chapterId ? chapters.find((c) => c.id === user.chapterId)?.name : undefined),
    [user?.chapterId, chapters],
  );

  if (!user) {
    return (
      <ScreenWrapper uniformLayout>
        <Text style={styles.emptyText}>{t('profile.noProfileData', 'No profile data found')}</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper uniformLayout>
      <MemberProfileContent
        user={user}
        chapterName={chapterName}
        events={events}
        meetings={meetings}
        referrals={referrals}
        asks={asks}
        visitorInvites={visitorInvites}
        businessEntries={businessEntries}
        defaultTab="business"
        showManagePhotosAction
        onEditProfile={() => navigation.navigate('EditProfile')}
        onOpenSettings={() => navigation.navigate('Settings')}
        onManagePhotos={() => navigation.navigate('BusinessPhotos')}
      />
    </ScreenWrapper>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
});
