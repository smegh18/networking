import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { SearchBar } from '../../components/ui/SearchBar';
import { BusinessCard } from '../../components/network/BusinessCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, layout } from '../../theme';
import type { DashboardStackParamList, User } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'SearchResults'>;

const SearchResultsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const initialQuery = route.params.query;
  const [query, setQuery] = useState(initialQuery);
  const { items: users } = useRealtimeCollection<User>('users', 'uid');

  const sections = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const businessMatches: User[] = [];
    const tagMatches: User[] = [];
    const categoryMatches: User[] = [];
    const seen = new Set<string>();

    users.forEach((user) => {
      if (user.businessName.toLowerCase().includes(q) || user.name.toLowerCase().includes(q)) {
        businessMatches.push(user);
        seen.add(user.uid);
      }
    });

    users.forEach((user) => {
      if (!seen.has(user.uid) && (user.businessTags || []).some((tag) => tag.toLowerCase().includes(q))) {
        tagMatches.push(user);
        seen.add(user.uid);
      }
    });

    users.forEach((user) => {
      if (!seen.has(user.uid) && user.businessCategory.toLowerCase().includes(q)) {
        categoryMatches.push(user);
      }
    });

    const result: { title: string; data: User[] }[] = [];
    if (businessMatches.length > 0) result.push({ title: t('search.businessNameMatches'), data: businessMatches });
    if (tagMatches.length > 0) result.push({ title: t('search.tagMatches'), data: tagMatches });
    if (categoryMatches.length > 0) result.push({ title: t('search.categoryMatches'), data: categoryMatches });
    return result;
  }, [query, t, users]);

  const openBusinessProfile = (userId: string) => {
    const tabNav = navigation.getParent();
    if (!tabNav) return;
    (tabNav as any).navigate('NetworkTab', {
      screen: 'BusinessProfile',
      params: { userId },
    });
  };

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <Header title={t('search.results')} onBack={() => navigation.goBack()} />

      <View style={styles.searchContainer}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('dashboard.searchPlaceholder')}
          autoFocus={false}
        />
      </View>

      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uid}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.cardContainer}>
              <BusinessCard
                user={item}
                onPress={() => openBusinessProfile(item.uid)}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <EmptyState
          icon="search-outline"
          title={t('search.noResults')}
          message={t('search.noResultsMessage')}
        />
      )}
    </ScreenWrapper>
  );
};

export default SearchResultsScreen;

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  cardContainer: {
    marginBottom: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
});
