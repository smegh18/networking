import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SearchBar } from '../ui/SearchBar';
import { spacing, layout } from '../../theme';

interface SearchSectionProps {
  onSearch: (query: string) => void;
}

export const SearchSection: React.FC<SearchSectionProps> = ({ onSearch }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <View style={styles.container}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t('dashboard.searchPlaceholder')}
        onSubmit={handleSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPadding,
    marginBottom: spacing.xl,
  },
});
