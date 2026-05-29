import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminModal } from '../components/ui/AdminModal';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getAllAsks, getAllReferrals, deleteAsk } from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { Ask, Referral } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminAsks'>;

const AdminAsksScreen: React.FC<Props> = () => {
  const [asks, setAsks] = useState<Ask[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailAsk, setDetailAsk] = useState<Ask | null>(null);
  const [deleteModal, setDeleteModal] = useState<Ask | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [asksData, referralsData] = await Promise.all([getAllAsks(), getAllReferrals()]);
      setAsks(asksData);
      setReferrals(referralsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const referralsForAsk = useMemo(() => {
    if (!detailAsk) return [];
    return referrals.filter((r) => r.askId === detailAsk.id);
  }, [detailAsk, referrals]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteAsk(deleteModal.id);
      setDeleteModal(null);
      setDetailAsk(null);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete ask.');
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  const formatDateTime = (value: string | number) =>
    new Date(value).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const columns = [
    { key: 'service', label: 'Service', sortable: true, width: 180 },
    { key: 'category', label: 'Category', sortable: true, width: 160 },
    { key: 'description', label: 'Description', width: 250 },
    { key: 'askerName', label: 'Asked By', sortable: true, width: 150 },
    { key: 'askerBusinessName', label: 'Business', width: 160 },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      width: 120,
      render: (item: Ask) => (
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
  ];

  return (
    <AdminLayout title="Ask Board" activeScreen="AdminAsks">
      <Text style={styles.subtitle}>{asks.length} asks posted</Text>

      <AdminDataTable
        columns={columns}
        data={asks}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No asks found"
        onRowPress={(item) => setDetailAsk(item)}
      />

      {/* Ask Detail Modal */}
      <AdminModal
        visible={!!detailAsk}
        title="Ask Details"
        confirmLabel="Close"
        onConfirm={() => setDetailAsk(null)}
        onCancel={() => setDetailAsk(null)}
      >
        {detailAsk && (
          <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Service</Text>
              <Text style={styles.detailValue}>{detailAsk.service}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{detailAsk.category}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{detailAsk.description || '—'}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Asked By</Text>
              <Text style={styles.detailValue}>{detailAsk.askerName}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Business</Text>
              <Text style={styles.detailValue}>{detailAsk.askerBusinessName}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{detailAsk.askerPhone || '—'}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>WhatsApp</Text>
              <Text style={styles.detailValue}>{detailAsk.askerWhatsapp || '—'}</Text>
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Posted</Text>
              <Text style={styles.detailValue}>{formatDateTime(detailAsk.createdAt)}</Text>
            </View>

            <Text style={styles.referralsTitle}>Referrals Given ({referralsForAsk.length})</Text>
            {referralsForAsk.length === 0 ? (
              <Text style={styles.noReferrals}>No referrals given for this ask yet.</Text>
            ) : (
              referralsForAsk.map((r) => (
                <View key={r.id} style={styles.referralCard}>
                  <View style={styles.referralRow}>
                    <Text style={styles.referralLabel}>From</Text>
                    <Text style={styles.referralValue}>{r.giverName}</Text>
                  </View>
                  <View style={styles.referralRow}>
                    <Text style={styles.referralLabel}>To</Text>
                    <Text style={styles.referralValue}>{r.receiverName}</Text>
                  </View>
                  <View style={styles.referralRow}>
                    <Text style={styles.referralLabel}>Contact</Text>
                    <Text style={styles.referralValue}>{r.contactName}</Text>
                  </View>
                  <View style={styles.referralRow}>
                    <Text style={styles.referralLabel}>Amount</Text>
                    <Text style={styles.referralValue}>{formatAmount(r.amount)}</Text>
                  </View>
                  <View style={styles.referralRow}>
                    <Text style={styles.referralLabel}>Status</Text>
                    <Text style={styles.referralValue}>{r.status}</Text>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                setDeleteModal(detailAsk);
                setDetailAsk(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.deleteButtonText}>Delete Ask</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </AdminModal>

      <AdminModal
        visible={!!deleteModal}
        title="Delete Ask"
        message={`Are you sure you want to remove this ask by ${deleteModal?.askerName}?`}
        confirmLabel="Delete"
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </AdminLayout>
  );
};

export default AdminAsksScreen;

const styles = StyleSheet.create({
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: ADMIN_LAYOUT.sectionGap,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  detailScroll: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.text,
  },
  referralsTitle: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  noReferrals: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  referralCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  referralRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  referralLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  referralValue: {
    ...typography.bodySmall,
    color: colors.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    ...typography.bodySmall,
    color: colors.error,
  },
});
