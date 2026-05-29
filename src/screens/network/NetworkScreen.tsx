import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { SearchBar } from '../../components/ui/SearchBar';
import { BusinessCard } from '../../components/network/BusinessCard';
import { FilterBar } from '../../components/network/FilterBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import { useBusinessConfig, useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, layout } from '../../theme';
import type { NetworkStackParamList, User, Chapter } from '../../types';

type Props = StackScreenProps<NetworkStackParamList, 'Network'>;

const NetworkScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const { config: businessConfig } = useBusinessConfig();
  const { items: users } = useRealtimeCollection<User>('users', 'uid');
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const locations = useMemo(
    () => Array.from(new Set(users.map((user) => user.location?.city).filter(Boolean) as string[])),
    [users],
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users
      .filter((user) => user.uid !== currentUser?.uid)
      .filter((user) => (user.isActive !== false))
      .filter((user) => {
        if (!q) return true;
        return (
          user.name.toLowerCase().includes(q) ||
          user.businessName.toLowerCase().includes(q) ||
          user.businessCategory.toLowerCase().includes(q) ||
          (user.businessTags || []).some((tag) => tag.toLowerCase().includes(q))
        );
      })
      .filter((user) => (!selectedChapter || user.chapterId === selectedChapter))
      .filter((user) => (!selectedLocation || user.location?.city === selectedLocation))
      .filter((user) => (!selectedCategory || user.businessCategory === selectedCategory));
  }, [currentUser?.uid, searchQuery, selectedCategory, selectedChapter, selectedLocation, users]);

  return (
    <ScreenWrapper scrollable={false} padded={false} edges={['top']}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('network.searchPlaceholder')}
          showFilter
          onFilterPress={() => navigation.navigate('Filter')}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.filterBarWrap}>
          <FilterBar
            chapters={chapters.map((ch) => ({ id: ch.id, name: ch.name }))}
            selectedChapter={selectedChapter}
            onChapterSelect={setSelectedChapter}
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
            categories={businessConfig.businessCategories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        </View>
        <Text style={styles.resultText}>
          {filteredMembers.length} {t('network.members', 'Members')}
        </Text>
        {filteredMembers.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={t('network.noMembers')}
            message={t('network.noMembersMessage')}
          />
        ) : (
          filteredMembers.map((member) => (
            <View key={member.uid} style={styles.cardContainer}>
              <BusinessCard
                user={member}
                onPress={() => navigation.navigate('BusinessProfile', { userId: member.uid })}
              />
            </View>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

export default NetworkScreen;

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  filterBarWrap: {
    marginBottom: spacing.md,
  },
  resultText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  cardContainer: {
    marginBottom: spacing.lg,
  },
});
