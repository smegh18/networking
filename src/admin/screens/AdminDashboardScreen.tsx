import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminKPICard } from '../components/ui/AdminKPICard';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { getAdminDashboardStats } from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { AdminDashboardStats } from '../types/admin';

type Props = StackScreenProps<AdminStackParamList, 'AdminDashboard'>;

const DEFAULT_STATS: AdminDashboardStats = {
  totalUsers: 0,
  totalChapters: 0,
  totalZones: 0,

  totalEvents: 0,
  totalMeetings: 0,
  totalReferrals: 0,
  totalAds: 0,
  totalAsks: 0,
  activeUsers: 0,
  pendingReferrals: 0,
  completedReferrals: 0,
  upcomingEvents: 0,
  referralTotalAmount: 0,
};

const AdminDashboardScreen: React.FC<Props> = () => {
  const [stats, setStats] = useState<AdminDashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getAdminDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  return (
    <AdminLayout title="Dashboard" activeScreen="AdminDashboard">
      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Syncing data...</Text>
        </View>
      )}

      {/* KPI Cards Row 1 */}
      <View style={styles.kpiRow}>
        <AdminKPICard
          title="Total Users"
          value={stats.totalUsers}
          icon="people"
          iconColor={colors.primary}
          iconBg={colors.primaryFaded}
        />
        <AdminKPICard
          title="Active Users"
          value={stats.activeUsers}
          icon="person-circle"
          iconColor={colors.success}
          iconBg={colors.success + '15'}
        />
        <AdminKPICard
          title="Total Chapters"
          value={stats.totalChapters}
          icon="business"
          iconColor={colors.info}
          iconBg={colors.info + '15'}
        />
        <AdminKPICard
          title="Total Events"
          value={stats.totalEvents}
          icon="calendar"
          iconColor={colors.accent}
          iconBg={colors.accent + '15'}
        />
      </View>

      {/* KPI Cards Row 2 */}
      <View style={styles.kpiRow}>
        <AdminKPICard
          title="Total Referrals"
          value={stats.totalReferrals}
          icon="git-network"
          iconColor="#8B5CF6"
          iconBg="#8B5CF615"
        />
        <AdminKPICard
          title="Pending Referrals"
          value={stats.pendingReferrals}
          icon="hourglass"
          iconColor={colors.warning}
          iconBg={colors.warning + '15'}
        />
        <AdminKPICard
          title="Total Meetings"
          value={stats.totalMeetings}
          icon="chatbubbles"
          iconColor="#06B6D4"
          iconBg="#06B6D415"
        />
        <AdminKPICard
          title="Referral Value"
          value={formatAmount(stats.referralTotalAmount)}
          icon="cash"
          iconColor={colors.success}
          iconBg={colors.success + '15'}
        />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Referral Overview</Text>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={styles.summaryValue}>{stats.pendingReferrals}</Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.success }]} />
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={styles.summaryValue}>{stats.completedReferrals}</Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>{formatAmount(stats.referralTotalAmount)}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Platform Stats</Text>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.info }]} />
            <Text style={styles.summaryLabel}>Zones</Text>
            <Text style={styles.summaryValue}>{stats.totalZones}</Text>

          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.summaryLabel}>Upcoming Events</Text>
            <Text style={styles.summaryValue}>{stats.upcomingEvents}</Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.summaryLabel}>Active Ads</Text>
            <Text style={styles.summaryValue}>{stats.totalAds}</Text>
          </View>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.summaryLabel}>Ask Board Posts</Text>
            <Text style={styles.summaryValue}>{stats.totalAsks}</Text>
          </View>
        </View>
      </View>
    </AdminLayout>
  );
};

export default AdminDashboardScreen;

const styles = StyleSheet.create({
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: ADMIN_LAYOUT.sectionGap,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: ADMIN_LAYOUT.elementGap,
    marginBottom: ADMIN_LAYOUT.sectionGap,
    flexWrap: 'wrap',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: ADMIN_LAYOUT.elementGap,
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  summaryTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: ADMIN_LAYOUT.elementGap,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  summaryValue: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
