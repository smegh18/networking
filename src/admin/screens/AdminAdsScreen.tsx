import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { AdminModal } from '../components/ui/AdminModal';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getAllAds, deleteAd, toggleAdActive } from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { Ad } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminAds'>;

const AdminAdsScreen: React.FC<Props> = ({ navigation }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<Ad | null>(null);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setLoading(true);
      const data = await getAllAds();
      setAds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (ad: Ad) => {
    try {
      await toggleAdActive(ad.id, !ad.active);
      await loadAds();
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle ad status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteAd(deleteModal.id);
      setDeleteModal(null);
      await loadAds();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete ad.');
    }
  };

  const columns = [
    {
      key: 'imageURL',
      label: 'Preview',
      width: 140,
      render: (item: Ad) =>
        item.imageURL ? (
          <Image source={{ uri: item.imageURL }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
          </View>
        ),
    },
    { key: 'title', label: 'Title', sortable: true, width: 300 },
    { key: 'businessName', label: 'Business', sortable: true, width: 260 },
    {
      key: 'active',
      label: 'Status',
      width: 140,
      render: (item: Ad) => (
        <AdminStatusBadge
          label={item.active ? 'Active' : 'Inactive'}
          color={item.active ? colors.success : colors.textTertiary}
        />
      ),
    },
    {
      key: 'expiresAt',
      label: 'Expires',
      sortable: true,
      width: 180,
      render: (item: Ad) => (
        <Text style={styles.dateText}>
          {item.expiresAt
            ? new Date(item.expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </Text>
      ),
    },
  ];

  return (
    <AdminLayout title="Ad Management" activeScreen="AdminAds">
      <View style={styles.topBar}>
        <Text style={styles.countText}>{ads.length} ads total</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdminAdForm', {})}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Create Ad</Text>
        </TouchableOpacity>
      </View>

      <AdminDataTable
        columns={columns}
        data={ads}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No ads found"
        paginate={false}
        fullWidth
        actions={(item) => (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleToggle(item)} activeOpacity={0.7}>
              <Ionicons
                name={item.active ? 'pause-circle-outline' : 'play-circle-outline'}
                size={18}
                color={item.active ? colors.warning : colors.success}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminAdForm', { adId: item.id })}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteModal(item)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      <AdminModal
        visible={!!deleteModal}
        title="Delete Ad"
        message={`Are you sure you want to delete "${deleteModal?.title}"?`}
        confirmLabel="Delete"
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </AdminLayout>
  );
};

export default AdminAdsScreen;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ADMIN_LAYOUT.sectionGap,
  },
  countText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addButtonText: {
    ...typography.bodySmallMedium,
    color: colors.textInverse,
  },
  thumbnail: {
    width: 100,
    height: 56,
    borderRadius: 6,
    backgroundColor: colors.surfaceVariant,
  },
  noImage: {
    width: 100,
    height: 56,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
