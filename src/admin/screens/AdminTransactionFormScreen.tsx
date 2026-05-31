import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';

import { AdminLayout } from '../components/layout/AdminLayout';
import {
  AdminFormField,
  AdminDropdownField,
} from '../components/ui/AdminFormField';
import { ADMIN_LAYOUT } from '../constants/layout';

import { colors, typography, spacing, borderRadius } from '../../theme';
import {
  getBusinessAdmin,
  updateBusinessAdmin,
} from '../services/adminFirestore';

import type { AdminStackParamList } from '../types/admin';
import type { Business } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminTransactionForm'>;

const AdminTransactionFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const transactionId = route.params?.transactionId;

  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<Business['status']>('pending');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<Business | null>(null);

  useEffect(() => {
    if (transactionId) loadTransaction(transactionId);
  }, [transactionId]);

  const loadTransaction = async (id: string) => {
    try {
      const data = await getBusinessAdmin(id);
      if (data) {
        setTransaction(data);
        setAmount(String(data.amount));
        setStatus(data.status || 'pending');
        setDate(data.date || '');
      }
    } catch {
      Alert.alert('Error', 'Failed to load transaction data.');
    }
  };

  const statusOptions = useMemo(
    () => [
      { key: 'pending', label: 'Pending' },
      { key: 'approved', label: 'Approved' },
      { key: 'rejected', label: 'Rejected' },
    ],
    []
  );

  const handleSave = async () => {
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal)) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      setSaving(true);
      await updateBusinessAdmin(transactionId, {
        amount: amountVal,
        status,
        date,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Edit Transaction"
      activeScreen="AdminTransactions"
      showBackButton
      onBack={() => navigation.goBack()}
    >
      <View style={styles.formCard}>
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>From:</Text>
          <Text style={styles.infoValue}>{transaction?.givenByName}</Text>
          
          <Text style={styles.infoLabel}>To:</Text>
          <Text style={styles.infoValue}>{transaction?.givenToName}</Text>
          
          <Text style={styles.infoLabel}>Chapter:</Text>
          <Text style={styles.infoValue}>{transaction?.chapterName}</Text>
          
          <Text style={styles.infoLabel}>Type:</Text>
          <Text style={styles.infoValue}>{transaction?.type}</Text>
        </View>

        <View style={styles.divider} />

        <View style={[styles.row, isCompact && styles.rowCompact]}>
          <View style={styles.fieldColumn}>
            <AdminFormField
              label="Amount (₹)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.fieldColumn}>
            <AdminDropdownField
              label="Status"
              value={status || 'pending'}
              options={statusOptions}
              onSelect={(val) => setStatus(val as Business['status'])}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.fieldColumn}>
            <AdminFormField
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder="2024-01-01"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving...' : 'Update Transaction'}
          </Text>
        </TouchableOpacity>
      </View>
    </AdminLayout>
  );
};

export default AdminTransactionFormScreen;

const styles = StyleSheet.create({
  formCard: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: ADMIN_LAYOUT.elementGap,
    marginBottom: spacing.sm,
  },
  rowCompact: {
    flexDirection: 'column',
    gap: 0,
  },
  fieldColumn: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
});
