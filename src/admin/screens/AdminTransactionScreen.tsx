import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminTabFilter } from '../components/ui/AdminTabFilter';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { AdminKPICard } from '../components/ui/AdminKPICard';
import { AdminChipsInput } from '../components/ui/AdminChipsInput';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { updateBusinessStatusAdmin, deleteBusinessTransaction } from '../services/adminFirestore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import type { AdminStackParamList } from '../types/admin';
import type { Business } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminTransaction'>;

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  ask_board: 'Ask Board',
  one_on_one: '1-on-1',
  referral: 'Referral',
};

const STATUS_COLORS: Record<string, string> = {
  pending: colors.warning,
  approved: colors.success,
  rejected: colors.error,
};

const AdminTransactionScreen: React.FC<Props> = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 900;
  const { items: rawTransactions, loading } = useRealtimeCollection<Business>('business');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  const transactions = useMemo(() => {
    return [...rawTransactions].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [rawTransactions]);

  const stats = useMemo(() => {
    const approved = transactions.filter(t => t.status === 'approved');
    const pending = transactions.filter(t => !t.status || t.status === 'pending');
    
    return {
      totalBusiness: approved.reduce((sum, t) => sum + (t.amount || 0), 0),
      approvedCount: approved.length,
      pendingCount: pending.length,
    };
  }, [transactions]);

  const handleUpdateStatus = async (id: string, status: Business['status']) => {
    try {
      await updateBusinessStatusAdmin(id, status);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBusinessTransaction(id);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (activeTab !== 'all') {
      result = result.filter((t) => t.status === activeTab);
    }

    if (searchTags.length > 0) {
      result = result.filter((t) => {
        return searchTags.every((tag) => {
          const q = tag.toLowerCase();
          return (
            t.givenByName.toLowerCase().includes(q) ||
            t.givenToName.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.chapterName.toLowerCase().includes(q) ||
            (t.city || '').toLowerCase().includes(q) ||
            (t.state || '').toLowerCase().includes(q) ||
            String(t.amount).includes(q) ||
            (BUSINESS_TYPE_LABELS[t.type] || t.type).toLowerCase().includes(q) ||
            (t.status || 'pending').toLowerCase().includes(q)
          );
        });
      });
    }

    return result;
  }, [transactions, activeTab, searchTags]);

  const tabs = useMemo(() => [
    { key: 'all', label: 'All', count: transactions.length },
    { key: 'pending', label: 'Pending', count: transactions.filter((t) => t.status === 'pending').length },
    { key: 'approved', label: 'Approved', count: transactions.filter((t) => t.status === 'approved').length },
  ], [transactions]);

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      width: 90,
      render: (item: Business) => (
        <Text style={styles.dateText}>
          {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </Text>
      ),
    },
    {
      key: 'givenByName',
      label: 'From',
      sortable: true,
      width: 150,
    },
    {
      key: 'chapterName',
      label: 'Chapter',
      sortable: true,
      width: 180,
    },
    {
      key: 'city',
      label: 'City',
      sortable: true,
      width: 50,
    },
    {
      key: 'state',
      label: 'State',
      sortable: true,
      width: 50,
    },
    {
      key: 'givenToName',
      label: 'To',
      sortable: true,
      width: 150,
      render: (item: Business) => (
        <View>
          <Text style={styles.mainText}>{item.givenToName}</Text>
          <Text style={styles.subText}>{item.name}</Text>
        </View>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      width: 110,
      render: (item: Business) => (
        <Text style={styles.typeText}>{BUSINESS_TYPE_LABELS[item.type] || item.type}</Text>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      width: 90,
      render: (item: Business) => (
        <Text style={styles.amountText}>{formatAmount(item.amount)}</Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 110,
      render: (item: Business) => (
        <AdminStatusBadge
          label={item.status || 'pending'}
          color={STATUS_COLORS[item.status || 'pending'] || colors.textSecondary}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: 70,
      render: (item: Business) => (
        <View style={styles.actions}>
          {/*
          {item.status === 'pending' && (
            <TouchableOpacity onPress={() => handleUpdateStatus(item.id, 'approved')}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
            </TouchableOpacity>
          )}
          */}
          <TouchableOpacity onPress={() => navigation.navigate('AdminTransactionForm', { transactionId: item.id })}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          {/*
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
          */}
        </View>
      ),
    },
  ];

  return (
    <AdminLayout title="Business Transactions" activeScreen="AdminTransaction">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchWrap}>
            <AdminChipsInput
              label=""
              values={searchTags}
              onChange={setSearchTags}
              placeholder="Filter by name, chapter, city, status... (Press Enter to add)"
            />
          </View>
        </View>

        <AdminTabFilter
          tabs={tabs}
          activeKey={activeTab}
          onSelect={setActiveTab}
        />

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <AdminKPICard
            title="Total Business"
            value={formatAmount(stats.totalBusiness)}
            icon="cash-outline"
            iconColor={colors.success}
            iconBg={colors.success + '15'}
          />
          <AdminKPICard
            title="Business Given"
            value={0}
            icon="arrow-up-circle-outline"
            iconColor={colors.primary}
            iconBg={colors.primaryFaded}
          />
          <AdminKPICard
            title="Business Rweceived"
            value={0}
            icon="arrow-down-circle-outline"
            iconColor={colors.warning}
            iconBg={colors.warning + '15'}
          />
        </View>

        <View style={styles.tableWrap}>
          <AdminDataTable
            columns={columns}
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            loading={loading}
            enablePagination={false}
            maxBodyHeight={isCompact ? 450 : 650}
            emptyMessage="No business transactions found"
          />
        </View>
      </View>
    </AdminLayout>
  );
};

export default AdminTransactionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    flexWrap: 'wrap',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  searchWrap: {
    flex: 1,
  },
  tableWrap: {
    marginTop: spacing.md,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  mainText: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  subText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  typeText: {
    ...typography.captionMedium,
    color: colors.primary,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  amountText: {
    ...typography.bodySmallMedium,
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
