import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Section } from '../../components/layout/Section';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { useBusinessConfig, useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { NetworkStackParamList, Chapter, User } from '../../types';

type Props = StackScreenProps<NetworkStackParamList, 'Filter'>;

const FilterScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { config: businessConfig } = useBusinessConfig();
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
  const { items: users } = useRealtimeCollection<User>('users', 'uid');

  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const locations = useMemo(
    () => Array.from(new Set(users.map((u) => u.location?.city).filter(Boolean) as string[])),
    [users],
  );

  const toggleChapter = (id: string) => {
    setSelectedChapters((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleApply = () => navigation.goBack();
  const handleReset = () => {
    setSelectedChapters([]);
    setSelectedLocation('');
    setSelectedTags([]);
  };

  const hasFilters = selectedChapters.length > 0 || selectedLocation !== '' || selectedTags.length > 0;

  return (
    <ScreenWrapper>
      <Header title={t('filter.title')} onBack={() => navigation.goBack()} />

      <Section title={t('filter.chapter')}>
        {chapters.map((chapter) => {
          const isSelected = selectedChapters.includes(chapter.id);
          return (
            <TouchableOpacity key={chapter.id} style={styles.checkboxRow} onPress={() => toggleChapter(chapter.id)} activeOpacity={0.7}>
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected ? <Ionicons name="checkmark" size={16} color={colors.textInverse} /> : null}
              </View>
              <View style={styles.chapterInfo}>
                <Text style={styles.chapterName}>{chapter.name}</Text>
                <Text style={styles.chapterMeta}>
                  {chapter.location.city} - {chapter.memberCount} {t('filter.members')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </Section>

      <Section title={t('filter.location')}>
        <View style={styles.chipRow}>
          <Chip label={t('filter.allLocations')} selected={selectedLocation === ''} onPress={() => setSelectedLocation('')} icon="location-outline" />
          {locations.map((loc) => (
            <Chip key={loc} label={loc} selected={selectedLocation === loc} onPress={() => setSelectedLocation(loc)} icon="location-outline" />
          ))}
        </View>
      </Section>

      <Section title={t('filter.tags')}>
        <View style={styles.chipRow}>
          {businessConfig.popularTags.map((tag) => (
            <Chip key={tag} label={tag} selected={selectedTags.includes(tag)} onPress={() => toggleTag(tag)} />
          ))}
        </View>
      </Section>

      <View style={styles.actions}>
        <Button title={t('filter.reset')} onPress={handleReset} variant="outline" style={styles.actionButton} disabled={!hasFilters} />
        <Button title={t('filter.apply')} onPress={handleApply} variant="primary" style={styles.actionButton} />
      </View>
    </ScreenWrapper>
  );
};

export default FilterScreen;

const styles = StyleSheet.create({
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.xs,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  chapterMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing['3xl'],
    marginBottom: spacing['3xl'],
  },
  actionButton: {
    flex: 1,
  },
});
