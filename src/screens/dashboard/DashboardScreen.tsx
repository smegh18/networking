import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Section } from '../../components/layout/Section';
import { Avatar } from '../../components/ui/Avatar';
import { SearchBar } from '../../components/ui/SearchBar';
import { AdCarousel } from '../../components/dashboard/AdCarousel';
import { StatsRow } from '../../components/dashboard/StatsRow';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { EventCard } from '../../components/dashboard/EventCard';
import { AskBoard } from '../../components/dashboard/AskBoard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing } from '../../theme';
import { isEventVisibleToChapter } from '../../utils/eventAudience';
import type {
  DashboardStackParamList,
  User,
  Ad,
  Event,
  DashboardStats,
  Chapter,
  Business,
} from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width <= 900;
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const currentUser = useAuthStore((s) => s.user);

  const { items: ads } = useRealtimeCollection<Ad>('ads');
  const { items: events } = useRealtimeCollection<Event>('events');
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
  const { items: users } = useRealtimeCollection<User>('users', 'uid');
  const { items: businessEntries } = useRealtimeCollection<Business>('business');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const stats = useMemo<DashboardStats>(() => {
    const safeUsers = users.filter(
      (u) => u.isActive !== false && u.profileComplete !== false && !!u.uid,
    );
    const safeUserIds = new Set(safeUsers.map((u) => u.uid));
    const safeChapterIds = new Set(
      chapters
        .filter((chapter) => !!chapter.id && !!String(chapter.name || '').trim())
        .map((chapter) => chapter.id),
    );

    // Count only approved business records that still point to real users/chapters.
    const approvedBusiness = businessEntries.filter((b) => {
      if (b.status && b.status !== 'approved') return false;
      if (!b.chapterId || !b.givenById || !b.givenToId) return false;
      if (!safeChapterIds.has(b.chapterId)) return false;
      if (!safeUserIds.has(b.givenById) || !safeUserIds.has(b.givenToId)) return false;
      if (b.referredById && !safeUserIds.has(b.referredById)) return false;
      return typeof b.amount === 'number' && Number.isFinite(b.amount) && b.amount > 0;
    });

    // Total business in the system
    const bbcTotal = approvedBusiness.reduce((sum, b) => sum + (b.amount || 0), 0);

    // Total business in the current user's chapter
    const chapterBusiness = currentUser?.chapterId
      ? approvedBusiness
        .filter((b) => b.chapterId === currentUser.chapterId)
        .reduce((sum, b) => sum + (b.amount || 0), 0)
      : 0;

    // Total business in the current user's city
    // Find all users in the current user's city
    const usersInCity = currentUser?.location?.city
      ? new Set(safeUsers.filter((u) => (u.location?.city || '') === currentUser.location?.city).map(u => u.uid))
      : new Set<string>();

    const cityBusiness = currentUser?.location?.city
      ? approvedBusiness
        .filter((b) => usersInCity.has(b.givenById) || usersInCity.has(b.givenToId))
        .reduce((sum, b) => sum + (b.amount || 0), 0)
      : 0;

    const businessGiven = currentUser?.uid
      ? approvedBusiness.filter((b) => b.givenById === currentUser.uid).length
      : 0;
    const businessReceived = currentUser?.uid
      ? approvedBusiness.filter((b) => b.givenToId === currentUser.uid).length
      : 0;
    const businessGivenAmount = currentUser?.uid
      ? approvedBusiness
        .filter((b) => b.givenById === currentUser.uid)
        .reduce((sum, b) => sum + (b.amount || 0), 0)
      : 0;
    const businessReceivedAmount = currentUser?.uid
      ? approvedBusiness
        .filter((b) => b.givenToId === currentUser.uid)
        .reduce((sum, b) => sum + (b.amount || 0), 0)
      : 0;
    return {
      bbcTotal,
      chapterBusiness,
      cityBusiness,
      businessGiven,
      businessReceived,
      businessGivenAmount,
      businessReceivedAmount,
    };
  }, [chapters, currentUser?.chapterId, currentUser?.location?.city, currentUser?.uid, users, businessEntries]);

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter((event) => (event.date || '').slice(0, 10) >= today)
      .filter((event) => isEventVisibleToChapter(event, currentUser?.chapterId))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 6);
  }, [currentUser?.chapterId, events]);

  const liveAds = useMemo(
    () =>
      ads
        .filter((ad) => ad.active !== false)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [ads],
  );

  const tabNav = navigation.getParent();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning');
    if (hour < 17) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  };

  const handleGoToProfile = () => tabNav?.navigate('ProfileTab');
  const handleAdPress = (ad: Ad) => {
    const targetType = ad.targetType || 'user';
    const targetId = (ad.targetId || '').trim();
    const normalize = (v?: string) => String(v || '').trim().toLowerCase();

    if (targetType === 'event') {
      const eventId = targetId || events.find((e) => normalize(e.title) === normalize(ad.businessName) || normalize(e.title) === normalize(ad.title))?.id || '';
      if (!eventId) return;
      navigation.navigate('EventDetail', { eventId });
      return;
    }

    const userId = (targetId || ad.userId || '').trim()
      || users.find((u) => normalize(u.businessName) === normalize(ad.businessName) || normalize(u.name) === normalize(ad.businessName))?.uid
      || '';
    if (!userId) return;

    // Prefer tab parent if available; fallback to a root dispatch.
    try {
      (tabNav as any)?.navigate?.('NetworkTab', { screen: 'BusinessProfile', params: { userId } });
      return;
    } catch {
      // ignore
    }

    navigation.dispatch(
      CommonActions.navigate({
        name: 'MainTabs',
        params: {
          screen: 'NetworkTab',
          params: { screen: 'BusinessProfile', params: { userId } },
        },
      } as never),
    );
  };
  const handleGiveReferral = (ask: any) =>
    navigation.navigate('ScheduleMeeting', {
      askId: ask.id,
      askService: ask.service,
      askCategory: ask.category,
      askDescription: ask.description,
    });
  const handleScheduleOneOnOne = (_ask?: any) => navigation.navigate('ScheduleMeeting', {});
  const handleSearchSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigation.navigate('SearchResults', { query: trimmed });
  };

  if (!currentUser) {
    return (
      <ScreenWrapper>
        <EmptyState
          icon="person-outline"
          title={t('profile.noProfileData', 'No profile data found')}
          message={t('dashboard.refreshToSync', 'Please re-login to sync your account data.')}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper refreshing={refreshing} onRefresh={onRefresh} padded={false} contentStyle={styles.screenContent}>

      <View style={[styles.heroCard, isMobile && styles.mobileCard]}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{currentUser.name}</Text>
          </View>
          <TouchableOpacity onPress={handleGoToProfile} hitSlop={8}>
            <Avatar uri={currentUser.photoURL} name={currentUser.name} size="md" />
          </TouchableOpacity>
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('dashboard.searchPlaceholder')}
          onSubmit={handleSearchSubmit}
        />
      </View>

      {liveAds.length > 0 ? (
        <AdCarousel ads={liveAds} onAdPress={handleAdPress} />
      ) : null}

      <Section title={t('dashboard.myStats')} style={isMobile ? styles.mobileCardSection : undefined}>
        <StatsRow stats={stats} />
      </Section>

      <Section title={t('dashboard.quickActions')} style={isMobile ? styles.mobileCardSection : undefined}>
        <QuickActions
          onScheduleMeeting={() => navigation.navigate('ScheduleMeeting', {})}
          onInteractions={() => navigation.navigate('Interactions')}
          onReferralStatus={() => navigation.navigate('ReferralStatus')}
          onMyEvents={() => navigation.navigate('Events')}
        />
      </Section>

      <View style={styles.askBoardSection}>
        <AskBoard
          onGiveReferral={handleGiveReferral}
          onSchedule={handleScheduleOneOnOne}
        />
      </View>

      <Section
        title={t('dashboard.upcomingEvents')}
        actionLabel={t('common.viewAll')}
        onAction={() => navigation.navigate('Events')}
        style={isMobile ? styles.mobileCardSection : undefined}
      >
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
            />
          ))
        ) : (
          <View style={styles.emptyEvents}>
            <Text style={styles.emptyEventsText}>{t('events.noEventsMessage')}</Text>
          </View>
        )}
      </Section>
    </ScreenWrapper>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  screenContent: {
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  mobileCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  greetingText: {
    flex: 1,
    marginRight: spacing.md,
  },
  greeting: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },
  mobileCardSection: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    marginBottom: spacing.xl,
  },
  askBoardSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  emptyEvents: {
    paddingVertical: spacing.xl,
  },
  emptyEventsText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
});
