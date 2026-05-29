import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { Chip } from '../ui/Chip';
import { User } from '../../types';
import { truncateText } from '../../utils/helpers';

interface BusinessCardProps {
  user: User;
  onPress: () => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ user, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <Avatar uri={user.photoURL} name={user.name} size="md" />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          <Text style={styles.business} numberOfLines={1}>{user.businessName}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.location}>
              {[user.location?.city, user.location?.state].filter(Boolean).join(', ') || '-'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>
      {user.businessDescription ? (
        <Text style={styles.description} numberOfLines={2}>
          {truncateText(user.businessDescription, 100)}
        </Text>
      ) : null}
      {user.businessTags && user.businessTags.length > 0 && (
        <View style={styles.tags}>
          {user.businessTags.slice(0, 3).map((tag, index) => (
            <Chip key={index} label={tag} />
          ))}
          {user.businessTags.length > 3 && (
            <Text style={styles.moreTag}>+{user.businessTags.length - 3}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.lg,
    marginRight: spacing.sm,
  },
  name: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  business: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  location: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: 4,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    alignItems: 'center',
  },
  moreTag: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
  },
});
