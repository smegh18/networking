import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import { REFERRAL_STATUSES } from '../../utils/constants';
import type { Ask, DashboardStackParamList, Referral } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'ReferralStatus'>;

interface ReceivedReferralGroup {
  ask: Ask | null;
  askId: string;
  referrals: Referral[];
}

const ReferralStatusScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'given' | 'received'>('given');

  const { items: allReferrals } = useRealtimeCollection<Referral>('referrals');
  const { items: asks } = useRealtimeCollection<Ask>('asks');

  const givenReferrals = useMemo(
    () => allReferrals.filter((referral) => referral.giverId === currentUser?.uid),
    [allReferrals, currentUser?.uid],
  );

  const receivedReferrals = useMemo(
    () => allReferrals.filter((referral) => referral.receiverId === currentUser?.uid),
    [allReferrals, currentUser?.uid],
  );

  const receivedReferralGroups = useMemo<ReceivedReferralGroup[]>(() => {
    const map = new Map<string, Referral[]>();
    receivedReferrals.forEach((referral) => {
      const key = referral.askId || 'unmapped';
      const current = map.get(key) ?? [];
      current.push(referral);
      map.set(key, current);
    });

    const groups: ReceivedReferralGroup[] = [];
    asks.forEach((ask) => {
      const grouped = map.get(ask.id);
      if (grouped?.length) {
        groups.push({ ask, askId: ask.id, referrals: grouped });
        map.delete(ask.id);
      }
    });

    const unmapped = map.get('unmapped');
    if (unmapped?.length) {
      groups.push({ ask: null, askId: 'unmapped', referrals: unmapped });
    }
    return groups;
  }, [asks, receivedReferrals]);

  const formatAmount = (amount: number) => {
    if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `Rs ${(amount / 1000).toFixed(0)}K`;
    return `Rs ${amount}`;
  };

  const handleReferralCardPress = (referral: Referral) => {
    if (referral.askId) {
      navigation.navigate('AskDetail', { askId: referral.askId });
    }
  };

  const renderReferralCard = (item: Referral, direction: 'given' | 'received') => {
    const statusConfig = REFERRAL_STATUSES[item.status];
    const cardContent = (
      <Card style={styles.referralCard}>
        <View style={styles.referralHeader}>
          <View style={styles.referralNames}>
            <Text style={styles.personLabel}>
              {direction === 'given' ? t('referrals.to') : t('referrals.from')}
            </Text>
            <Text style={styles.personName}>
              {direction === 'given' ? item.receiverName : item.giverName}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <Text style={styles.referralDesc} numberOfLines={2}>{item.businessDescription}</Text>

        <View style={styles.referralFooter}>
          <View style={styles.contactInfo}>
            <Ionicons name="person-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.contactName}>{item.contactName}</Text>
          </View>
          <View style={styles.amountContainer}>
            <Ionicons name="cash-outline" size={16} color={colors.success} />
            <Text style={styles.amountText}>{formatAmount(item.amount || 0)}</Text>
          </View>
        </View>
      </Card>
    );

    if (item.askId) {
      return (
        <TouchableOpacity onPress={() => handleReferralCardPress(item)} activeOpacity={0.8}>
          {cardContent}
        </TouchableOpacity>
      );
    }
    return <View>{cardContent}</View>;
  };

  const renderReceivedGroup = ({ item }: { item: ReceivedReferralGroup }) => (
    <View style={styles.groupSection}>
      <Card style={styles.groupHeaderCard}>
        <View style={styles.groupHeaderRow}>
          <View style={styles.groupHeaderInfo}>
            <Text style={styles.groupService}>{item.ask?.service || t('referrals.otherAsk', 'Other Ask')}</Text>
            <Text style={styles.groupMeta}>{item.ask?.category || t('referrals.general', 'General')}</Text>
          </View>
          <View style={styles.groupCountBadge}>
            <Text style={styles.groupCountText}>{item.referrals.length}</Text>
          </View>
        </View>
        <Text style={styles.groupDescription} numberOfLines={2}>
          {item.ask?.description || t('referrals.unmappedAskDescription', 'Referrals not mapped to a visible ask.')}
        </Text>
      </Card>

      <View style={styles.groupReferralsWrap}>
        {item.referrals.map((referral) => (
          <View key={referral.id} style={styles.groupReferralItem}>
            {renderReferralCard(referral, 'received')}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <Header title={t('referrals.title')} onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'given' && styles.tabActive]} onPress={() => setActiveTab('given')}>
          <Ionicons name="arrow-up-circle-outline" size={18} color={activeTab === 'given' ? colors.textInverse : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'given' && styles.tabTextActive]}>{t('referrals.given')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'received' && styles.tabActive]} onPress={() => setActiveTab('received')}>
          <Ionicons name="arrow-down-circle-outline" size={18} color={activeTab === 'received' ? colors.textInverse : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>{t('referrals.received')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'given' ? (
        <FlatList
          data={givenReferrals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderReferralCard(item, 'given')}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <EmptyState icon="git-network-outline" title={t('referrals.noReferrals')} message={t('referrals.noReferralsMessage')} />
          )}
        />
      ) : (
        <FlatList
          data={receivedReferralGroups}
          keyExtractor={(item) => item.askId}
          renderItem={renderReceivedGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <EmptyState icon="git-network-outline" title={t('referrals.noReferrals')} message={t('referrals.noReferralsMessage')} />
          )}
        />
      )}
    </ScreenWrapper>
  );
};

export default ReferralStatusScreen;

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
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
  listContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['4xl'],
  },
  referralCard: {
    marginBottom: spacing.lg,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  referralNames: {
    flex: 1,
    marginRight: spacing.sm,
  },
  personLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  personName: {
    ...typography.bodySemiBold,
    color: colors.text,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.captionMedium,
  },
  referralDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  referralFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  contactName: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amountText: {
    ...typography.bodySmallMedium,
    color: colors.success,
  },
  groupSection: {
    marginBottom: spacing.xl,
  },
  groupHeaderCard: {
    marginBottom: spacing.md,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  groupHeaderInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  groupService: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  groupMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  groupCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  groupCountText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  groupDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  groupReferralsWrap: {
    gap: spacing.md,
  },
  groupReferralItem: {
    width: '100%',
  },
});
