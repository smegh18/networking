import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminKPICard } from '../components/ui/AdminKPICard';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminTabFilter } from '../components/ui/AdminTabFilter';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { AdminModal } from '../components/ui/AdminModal';
import { AdminMultiSelectSearch, SearchSuggestion } from '../components/ui/AdminMultiSelectSearch';
import { ADMIN_LAYOUT } from '../constants/layout';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { useFirestoreListener } from '../hooks/useFirestoreListener';
import { deleteBusinessTransaction, getAllUsersAdmin, getAllChapters } from '../services/adminFirestore';

import type { AdminStackParamList } from '../types/admin';
import type { Business, User, Chapter } from '../../types';
import { normalizeTextLower } from '../../utils/helpers';

type Props = StackScreenProps<AdminStackParamList, 'AdminTransactions'>;

const AdminTransactionScreen: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
  const { data: transactions, loading: transactionsLoading } = useFirestoreListener<Business>('business');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  const [selectedSearchItems, setSelectedSearchItems] = useState<SearchSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteModal, setDeleteModal] = useState<Business | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [u, c] = await Promise.all([getAllUsersAdmin(), getAllChapters()]);
        setAllUsers(u);
        setAllChapters(c);
      } finally {
        setLoadingExtra(false);
      }
    };
    loadData();
  }, []);

  const searchSuggestions = useMemo(() => {
    const suggestions: SearchSuggestion[] = [];
    
    // Unique Chapters
    allChapters.forEach(c => {
      suggestions.push({ key: c.id, label: c.name, type: 'chapter' });
    });
    
    // Unique Cities and States from Users
    const cities = new Set<string>();
    const states = new Set<string>();
    allUsers.forEach(u => {
      if (u.location?.city) cities.add(u.location.city.trim());
      if (u.location?.state) states.add(u.location.state.trim());
    });
    
    Array.from(cities).sort().forEach(city => 
      suggestions.push({ key: city, label: city, type: 'city' })
    );
    Array.from(states).sort().forEach(state => 
      suggestions.push({ key: state, label: state, type: 'state' })
    );
    
    return suggestions;
  }, [allUsers, allChapters]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (activeTab === 'pending') {
      result = result.filter((t) => t.status === 'pending');
    } else if (activeTab === 'approved') {
      result = result.filter((t) => t.status === 'approved');
    }

    if (selectedSearchItems.length > 0) {
      result = result.filter(t => {
        const giver = allUsers.find(u => u.uid === t.givenById);
        const receiver = allUsers.find(u => u.uid === t.givenToId);
        
        // Match if it satisfies at least one selected item
        // OR: satisfied if it matches any of the selected filters
        return selectedSearchItems.some(item => {
          if (item.type === 'chapter') {
            return t.chapterId === item.key || normalizeTextLower(t.chapterName || '') === normalizeTextLower(item.label);
          }
          if (item.type === 'city') {
            const giverCity = normalizeTextLower(giver?.location?.city || '');
            const receiverCity = normalizeTextLower(receiver?.location?.city || '');
            const targetCity = normalizeTextLower(item.label);
            return giverCity === targetCity || receiverCity === targetCity;
          }
          if (item.type === 'state') {
            const giverState = normalizeTextLower(giver?.location?.state || '');
            const receiverState = normalizeTextLower(receiver?.location?.state || '');
            const targetState = normalizeTextLower(item.label);
            return giverState === targetState || receiverState === targetState;
          }
          return false;
        });
      });
    }

    return result;
  }, [transactions, activeTab, selectedSearchItems, allUsers]);

  const stats = useMemo(() => {
    // We only count approved transactions for the KPI cards
    const approved = filteredTransactions.filter(t => t.status === 'approved');
    
    return {
      total: approved.reduce((sum, t) => sum + (t.amount || 0), 0),
      referral: approved
        .filter(t => t.type === 'referral')
        .reduce((sum, t) => sum + (t.amount || 0), 0),
      direct: approved
        .filter(t => t.type !== 'referral')
        .reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }, [filteredTransactions]);

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
          value={formatAmount(stats.total)}
          icon="cash"
          iconColor={colors.primary}
          iconBg={colors.primaryFaded}
        />
        <AdminKPICard
          title="Business Given"
          value={formatAmount(stats.referral)}
          icon="arrow-up-circle"
          iconColor={colors.success}
          iconBg={colors.successLight}
        />
        <AdminKPICard
          title="Business Received"
          value={formatAmount(stats.direct)}
          icon="arrow-down-circle"
          iconColor={colors.accent}
          iconBg={colors.accentFaded}
        />
      </View>

      <View style={[styles.topBar, isCompact && styles.topBarCompact]}>
        <View style={styles.searchWrap}>
          <AdminMultiSelectSearch
            label="Filter Transactions"
            selectedItems={selectedSearchItems}
            onItemsChange={setSelectedSearchItems}
            suggestions={searchSuggestions}
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
        loading={transactionsLoading || loadingExtra}
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
    zIndex: 10,
    elevation: 10,
  },
  topBarCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchWrap: {
    flex: 1,
    zIndex: 10,
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
