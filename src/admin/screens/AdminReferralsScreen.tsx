import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminTabFilter } from '../components/ui/AdminTabFilter';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography } from '../../theme';
import { REFERRAL_STATUSES } from '../../utils/constants';
import { getAllReferrals } from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { Referral } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminReferrals'>;

const AdminReferralsScreen: React.FC<Props> = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const data = await getAllReferrals();
      setReferrals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = useMemo(() => {
    if (activeTab === 'all') return referrals;
    return referrals.filter((r) => r.status === activeTab);
  }, [referrals, activeTab]);

  const statusKeys = Object.keys(REFERRAL_STATUSES) as Array<keyof typeof REFERRAL_STATUSES>;
  const tabs = [
    { key: 'all', label: 'All', count: referrals.length },
    ...statusKeys.map((key) => ({
      key,
      label: REFERRAL_STATUSES[key].label,
      count: referrals.filter((r) => r.status === key).length,
    })),
  ];

  const formatAmount = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  const totalAmount = filteredReferrals.reduce((sum, r) => sum + (r.amount || 0), 0);

  const columns = [
    { key: 'giverName', label: 'From', sortable: true, width: 150 },
    { key: 'receiverName', label: 'To', sortable: true, width: 150 },
    { key: 'businessDescription', label: 'Description', width: 220 },
    { key: 'contactName', label: 'Contact', width: 130 },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      width: 110,
      render: (item: Referral) => (
        <Text style={styles.amountText}>{formatAmount(item.amount)}</Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 120,
      render: (item: Referral) => {
        const config = REFERRAL_STATUSES[item.status as keyof typeof REFERRAL_STATUSES];
        return <AdminStatusBadge label={config?.label || item.status} color={config?.color || colors.textSecondary} />;
      },
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      width: 120,
      render: (item: Referral) => (
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
  ];

  return (
    <AdminLayout title="Referral Management" activeScreen="AdminReferrals">
      <View style={styles.topBar}>
        <AdminTabFilter tabs={tabs} activeKey={activeTab} onSelect={setActiveTab} />
      </View>

      {/* Summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          Showing {filteredReferrals.length} referrals — Total value: {formatAmount(totalAmount)}
        </Text>
      </View>

      <AdminDataTable
        columns={columns}
        data={filteredReferrals}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No referrals found"
      />
    </AdminLayout>
  );
};

export default AdminReferralsScreen;

const styles = StyleSheet.create({
  topBar: {
    marginBottom: ADMIN_LAYOUT.elementGap,
  },
  summaryBar: {
    marginBottom: ADMIN_LAYOUT.sectionGap,
  },
  summaryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  amountText: {
    ...typography.bodySmallMedium,
    color: colors.success,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
