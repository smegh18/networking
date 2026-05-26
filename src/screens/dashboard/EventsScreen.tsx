import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { EventCard } from '../../components/dashboard/EventCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import { isEventVisibleToChapter } from '../../utils/eventAudience';
import type { DashboardStackParamList, Event } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'Events'>;

const EventsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { items: events } = useRealtimeCollection<Event>('events');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const sortedEvents = useMemo(
    () => events
      .filter((event) => isEventVisibleToChapter(event, currentUser?.chapterId))
      .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [currentUser?.chapterId, events],
  );

  const now = new Date().toISOString().slice(0, 10);
  const upcomingEvents = sortedEvents.filter((event) => (event.date || '').slice(0, 10) >= now);
  const pastEvents = sortedEvents.filter((event) => (event.date || '').slice(0, 10) < now).reverse();
  const tabEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <Header title={t('events.title')} onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            {t('events.upcoming')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            {t('events.past')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tabEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <EventCard
              event={item}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={(
          <EmptyState
            icon="calendar-outline"
            title={t('events.noEvents')}
            message={t('events.noEventsMessage')}
          />
        )}
      />
    </ScreenWrapper>
  );
};

export default EventsScreen;

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  tabText: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  cardContainer: {
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
});
