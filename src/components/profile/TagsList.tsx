import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from '../ui/Chip';
import { spacing } from '../../theme';

interface TagsListProps {
  tags: string[];
  onRemove?: (tag: string) => void;
  editable?: boolean;
}

export const TagsList: React.FC<TagsListProps> = ({ tags, onRemove, editable = false }) => {
  if (!tags || tags.length === 0) return null;

  return (
    <View style={styles.container}>
      {tags.map((tag, index) => (
        <Chip
          key={`${tag}-${index}`}
          label={tag}
          onRemove={editable ? () => onRemove?.(tag) : undefined}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
