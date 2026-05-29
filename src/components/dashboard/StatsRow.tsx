import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import { colors, spacing, breakpoints } from '../../theme';
import { DashboardStats } from '../../types';

interface StatsRowProps {
  stats: DashboardStats;
}

/** Format raw amount in Rupees to K, L, or Cr */
function formatAmountStr(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return cr % 1 === 0 ? `₹${cr}Cr` : `₹${cr.toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return l % 1 === 0 ? `₹${l}L` : `₹${l.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return k % 1 === 0 ? `₹${k}K` : `₹${k.toFixed(1)}K`;
  }
  return `₹${amount}`;
}

export const StatsRow: React.FC<StatsRowProps> = ({ stats }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > breakpoints.lg;
  const isMobile = !isWeb;

  // Screen width minus padding from ScreenWrapper/Section (usually around 40px total)
  // minus the gaps between 3 cards (2 gaps of 8px = 16px)
  // Divided by 3
  const CARD_GAP = 6;
  const PADDING_HORIZONTAL = 32; // Reduced from 40 to give more space
  const cardWidth = Math.floor((width - PADDING_HORIZONTAL - (CARD_GAP * 2)) / 3);

  const items = [
    { title: t('dashboard.bbcTotal'), value: formatAmountStr(stats.bbcTotal ?? 0), icon: 'briefcase-outline' as const, color: colors.statsGiven },
    { title: t('dashboard.chapterBusiness'), value: formatAmountStr(stats.chapterBusiness ?? 0), icon: 'business-outline' as const, color: colors.statsReceived },
    { title: t('dashboard.cityBusiness'), value: formatAmountStr(stats.cityBusiness ?? 0), icon: 'location-outline' as const, color: colors.statsReferralGiven },
    { title: t('dashboard.businessGivenAmount', 'Business Given Amount'), value: formatAmountStr(stats.businessGivenAmount ?? 0), icon: 'arrow-up-circle-outline' as const, color: colors.success },
    { title: t('dashboard.businessReceivedAmount', 'Business Received Amount'), value: formatAmountStr(stats.businessReceivedAmount ?? 0), icon: 'arrow-down-circle-outline' as const, color: colors.accent },
  ];

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        {items.map((item, index) => (
          <StatCard
            key={index}
            title={item.title}
            value={item.value}
            icon={item.icon}
            color={item.color}
            style={styles.webCard}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.mobileGrid}>
      {items.map((item, index) => (
        <StatCard
          key={index}
          title={item.title}
          value={item.value}
          icon={item.icon}
          color={item.color}
          compact={isMobile}
          style={{ width: cardWidth }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  mobileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    gap: 6,
  },
  webContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  webCard: {
    flex: 1,
    minWidth: 140,
  },
});
