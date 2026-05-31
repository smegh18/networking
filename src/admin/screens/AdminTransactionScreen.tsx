import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminKPICard } from '../components/ui/AdminKPICard';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminTabFilter } from '../components/ui/AdminTabFilter';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { AdminModal } from '../components/ui/AdminModal';
import { SearchBar } from '../../components/ui/SearchBar';
import { ADMIN_LAYOUT } from '../constants/layout';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { useFirestoreListener } from '../hooks/useFirestoreListener';
import { deleteBusinessTransaction } from '../services/adminFirestore';

import type { AdminStackParamList } from '../types/admin';
import type { Business } from '../../types';
import { normalizeTextLower } from '../../utils/helpers';

type Props = StackScreenProps<AdminStackParamList, 'AdminTransactions'>;

/** Placeholder until live aggregates are wired from Firestore */
const DUMMY_BUSINESS_STATS = {
  totalBusiness: 12_500,
  businessGiven: 7_200,
  businessReceived: 5_300,
} as const;

const AdminTransactionScreen: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
  const { data: transactions, loading } = useFirestoreListener<Business>('business');
  
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [deleteModal, setDeleteModal] = useState<Business | null>(null);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (activeTab === 'pending') {
      result = result.filter((t) => t.status === 'pending');
    } else if (activeTab === 'approved') {
      result = result.filter((t) => t.status === 'approved');
    }

    if (search.trim()) {
      const q = normalizeTextLower(search);
      result = result.filter(
        (t) =>
          normalizeTextLower(t.givenByName).includes(q) ||
          normalizeTextLower(t.givenToName).includes(q) ||
          normalizeTextLower(t.chapterName || '').includes(q)
      );
    }

    return result;
  }, [transactions, activeTab, search]);

  const tabs = useMemo(
    () => [
      { key: 'all', label: 'All', count: transactions.length },
      {
        key: 'pending',
        label: 'Pending',
        count: transactions.filter((t) => t.status === 'pending').length,
      },
      {
        key: 'approved',
        label: 'Approved',
        count: transactions.filter((t) => t.status === 'approved').length,
      },
    ],
    [transactions]
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns = useMemo(
    () => [
      {
        key: 'date',
        label: 'Date',
        width: 140,
        render: (item: Business) => (
          <Text style={styles.dateText}>
            {item.date ? new Date(item.date).toLocaleDateString('en-IN', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }) : 'N/A'}
          </Text>
        ),
      },
      {
        key: 'givenByName',
        label: 'From',
        width: 200,
        render: (item: Business) => (
          <View>
            <Text style={styles.nameText}>{item.givenByName}</Text>
            <Text style={styles.chapterText}>{item.chapterName}</Text>
          </View>
        ),
      },
      {
        key: 'givenToName',
        label: 'To',
        width: 280,
        render: (item: Business) => (
          <Text style={styles.nameText}>{item.givenToName}</Text>
        ),
      },
      {
        key: 'amount',
        label: 'Amount',
        width: 180,
        render: (item: Business) => (
          <Text style={styles.amountText}>{formatAmount(item.amount)}</Text>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 150,
        render: (item: Business) => (
          <AdminStatusBadge
            label={item.status || 'pending'}
            color={
              item.status === 'approved' 
                ? colors.success 
                : item.status === 'rejected' 
                ? colors.error 
                : colors.warning
            }
          />
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        width: 160,
        render: (item: Business) => (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('AdminTransactionForm', { transactionId: item.id })
              }
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteModal(item)}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ),
      },
    ],
    [navigation]
  );

  const handleDelete = async () => {
    if (!deleteModal) return;
    await deleteBusinessTransaction(deleteModal.id);
    setDeleteModal(null);
  };

  return (
    <AdminLayout title="Business Transactions" activeScreen="AdminTransactions">
      <View style={styles.kpiRow}>
        <AdminKPICard
          title="Total Business"
          value={formatAmount(DUMMY_BUSINESS_STATS.totalBusiness)}
          icon="cash"
          iconColor={colors.primary}
          iconBg={colors.primaryFaded}
        />
        <AdminKPICard
          title="Business Given"
          value={formatAmount(DUMMY_BUSINESS_STATS.businessGiven)}
          icon="arrow-up-circle"
          iconColor={colors.success}
          iconBg={colors.successLight}
        />
        <AdminKPICard
          title="Business Received"
          value={formatAmount(DUMMY_BUSINESS_STATS.businessReceived)}
          icon="arrow-down-circle"
          iconColor={colors.accent}
          iconBg={colors.accentFaded}
        />
      </View>

      <View style={[styles.topBar, isCompact && styles.topBarCompact]}>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or chapter..."
          />
        </View>
      </View>

      <AdminTabFilter
        tabs={tabs}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      <AdminDataTable
        columns={columns}
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        loading={loading}
        paginate={false}
        fullWidth
      />

      <AdminModal
        visible={!!deleteModal}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction?"
        confirmLabel="Delete"
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </AdminLayout>
  );
};

export default AdminTransactionScreen;

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: 'row',
    gap: ADMIN_LAYOUT.elementGap,
    marginBottom: ADMIN_LAYOUT.sectionGap,
    flexWrap: 'wrap',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: ADMIN_LAYOUT.sectionGap,
    gap: ADMIN_LAYOUT.elementGap,
  },
  topBarCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchWrap: {
    flex: 1,
  },
  nameText: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  chapterText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  amountText: {
    ...typography.bodySemiBold,
    color: colors.primary,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
});
