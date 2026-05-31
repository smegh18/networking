import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius } from '../../theme';
import type { Ask, DashboardStackParamList } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'AskDetail'>;

const AskDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { askId } = route.params;
  const { items: asks } = useRealtimeCollection<Ask>('asks');
  const ask = asks.find((a) => a.id === askId);

  if (!ask) {
    return (
      <ScreenWrapper>
        <Header title={t('referrals.relatedAsk', 'Related Ask')} onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.notFound}>{t('common.notFound', 'Ask not found.')}</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const created = ask.createdAt ? new Date(ask.createdAt).toLocaleString() : '';

  return (
    <ScreenWrapper>
      <Header title={t('referrals.relatedAsk', 'Related Ask')} onBack={() => navigation.goBack()} />
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.serviceBadge}>
            <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
            <Text style={styles.serviceBadgeText}>{ask.service}</Text>
          </View>
          <Text style={styles.timeText}>{created}</Text>
        </View>

        <View style={styles.categoryRow}>
          <Ionicons name="pricetag-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.categoryText}>{ask.category}</Text>
        </View>

        <Text style={styles.description}>{ask.description}</Text>

        <View style={styles.askerRow}>
          <Avatar name={ask.askerName} size="sm" />
          <View style={styles.askerInfo}>
            <Text style={styles.askerName}>{ask.askerName}</Text>
            <Text style={styles.askerBusiness}>{ask.askerBusinessName}</Text>
          </View>
        </View>
      </Card>
    </ScreenWrapper>
  );
};

export default AskDetailScreen;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  serviceBadgeText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  timeText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  askerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.md,
  },
  askerInfo: {
    flex: 1,
  },
  askerName: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  askerBusiness: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  notFound: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
