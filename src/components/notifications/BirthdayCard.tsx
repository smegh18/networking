import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '../../theme';
import { Avatar } from '../ui/Avatar';
import { User } from '../../types';

const WHATSAPP_GREEN = '#15803D';

interface BirthdayCardProps {
  user: User;
  onSendWish?: () => void;
}

export const BirthdayCard: React.FC<BirthdayCardProps> = ({ user, onSendWish }) => {
  return (
    <View style={styles.card}>
      <View style={styles.confetti}>
        <Text style={styles.emoji}>🎂</Text>
      </View>
      <Avatar uri={user.photoURL} name={user.name} size="md" />
      <View style={styles.content}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.business}>{user.businessName}</Text>
      </View>
      {onSendWish && (
        <TouchableOpacity style={styles.wishButton} onPress={onSendWish}>
          <Ionicons name="logo-whatsapp" size={18} color={WHATSAPP_GREEN} />
          <Text style={styles.whatsAppText}>Wish</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  confetti: {
    marginRight: spacing.md,
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  business: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  wishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: '#DCFCE7',
    gap: 4,
  },
  whatsAppText: {
    ...typography.captionMedium,
    color: WHATSAPP_GREEN,
  },
});
