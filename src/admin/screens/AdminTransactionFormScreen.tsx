import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminFormField, AdminDropdownField } from '../components/ui/AdminFormField';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getBusinessAdmin, updateBusinessAdmin } from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { Business } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminTransactionForm'>;

const AdminTransactionFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const { transactionId } = route.params;

  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<Business['status']>('pending');
  const [date, setDate] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const data = await getBusinessAdmin(transactionId);
      if (data) {
        setAmount(String(data.amount));
        setStatus(data.status || 'pending');
        setDate(data.date);
        setCity(data.city || '');
        setState(data.state || '');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load transaction data.');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      setSaving(true);
      await updateBusinessAdmin(transactionId, {
        amount: numAmount,
        status,
        date,
        city,
        state,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to update transaction.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Transaction" activeScreen="AdminTransaction" showBackButton onBack={() => navigation.goBack()}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Edit Transaction"
      activeScreen="AdminTransaction"
      showBackButton
      onBack={() => navigation.goBack()}
    >
      <View style={styles.formCard}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Transaction Details</Text>
          <Text style={styles.headerSubtitle}>ID: {transactionId}</Text>
        </View>

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
              onSelect={(key) => setStatus(key as Business['status'])}
            />
          </View>
        </View>

        <View style={[styles.row, isCompact && styles.rowCompact]}>
          <View style={styles.fieldColumn}>
            <AdminFormField
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-03-30"
            />
          </View>
          <View style={styles.fieldColumn} />
        </View>

        <View style={[styles.row, isCompact && styles.rowCompact]}>
          <View style={styles.fieldColumn}>
            <AdminFormField
              label="City"
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={styles.fieldColumn}>
            <AdminFormField
              label="State"
              value={state}
              onChangeText={setState}
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
  loadingContainer: {
    padding: spacing['4xl'],
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
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
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowCompact: {
    flexDirection: 'column',
    gap: 0,
  },
  fieldColumn: {
    flex: 1,
    minWidth: 0,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
