import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { User } from '../../types';

interface ProfileHeaderProps {
  user: User;
  showChapter?: boolean;
  /** Resolved chapter name (from user.chapterId). Shown above location when present. */
  chapterName?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, showChapter = true, chapterName }) => {
  const locationText = [user.location?.city, user.location?.state].filter(Boolean).join(', ');
  return (
    <View style={styles.container}>
      <Avatar uri={user.photoURL} name={user.name} size="xl" />
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.business}>{user.businessName}</Text>
      {user.businessCategory && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{user.businessCategory}</Text>
        </View>
      )}
      {showChapter && (chapterName || locationText) ? (
        <View style={styles.locationBlock}>
          {chapterName ? <Text style={styles.chapterName}>{chapterName}</Text> : null}
          {locationText ? <Text style={styles.location}>{locationText}</Text> : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  name: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  business: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  categoryBadge: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  locationBlock: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  chapterName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  location: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
