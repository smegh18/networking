import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminModal } from '../components/ui/AdminModal';
import { AdminFormField } from '../components/ui/AdminFormField';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import {
  getAllChapters,
  getAllZones,
  createChapter,
  updateChapter,
  deleteChapter,
  createZone,
  updateZone,
  deleteZone,
} from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { Chapter, Zone } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminChapters'>;

const AdminChaptersScreen: React.FC<Props> = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // Chapter form
  const [chapterModal, setChapterModal] = useState(false);
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);
  const [chapterName, setChapterName] = useState('');
  const [chapterCity, setChapterCity] = useState('');
  const [chapterState, setChapterState] = useState('');
  const [chapterZoneId, setChapterZoneId] = useState('');

  // Zone form
  const [zoneModal, setZoneModal] = useState(false);
  const [editZone, setEditZone] = useState<Zone | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneRegion, setZoneRegion] = useState('');

  // Delete
  const [deleteItem, setDeleteItem] = useState<{ type: 'chapter' | 'zone'; id: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chaptersData, zonesData] = await Promise.all([getAllChapters(), getAllZones()]);
      setChapters(chaptersData);
      setZones(zonesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Chapter handlers
  const openChapterForm = (chapter?: Chapter) => {
    if (chapter) {
      setEditChapter(chapter);
      setChapterName(chapter.name);
      setChapterCity(chapter.location?.city || '');
      setChapterState(chapter.location?.state || '');
      setChapterZoneId(chapter.zoneId || '');
    } else {
      setEditChapter(null);
      setChapterName('');
      setChapterCity('');
      setChapterState('');
      setChapterZoneId('');
    }
    setChapterModal(true);
  };

  const handleSaveChapter = async () => {
    if (!chapterName.trim()) {
      Alert.alert('Error', 'Chapter name is required.');
      return;
    }
    try {
      if (editChapter) {
        await updateChapter(editChapter.id, {
          name: chapterName.trim(),
          zoneId: chapterZoneId,
          location: { city: chapterCity.trim(), state: chapterState.trim() },
        });
      } else {
        await createChapter({
          name: chapterName.trim(),
          zoneId: chapterZoneId,
          location: { city: chapterCity.trim(), state: chapterState.trim() },
          memberCount: 0,
        });
      }
      setChapterModal(false);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save chapter.');
    }
  };

  // Zone handlers
  const openZoneForm = (zone?: Zone) => {
    if (zone) {
      setEditZone(zone);
      setZoneName(zone.name);
      setZoneRegion(zone.region);
    } else {
      setEditZone(null);
      setZoneName('');
      setZoneRegion('');
    }
    setZoneModal(true);
  };

  const handleSaveZone = async () => {
    if (!zoneName.trim()) {
      Alert.alert('Error', 'Zone name is required.');
      return;
    }
    try {
      if (editZone) {
        await updateZone(editZone.id, { name: zoneName.trim(), region: zoneRegion.trim() });
      } else {
        await createZone({ name: zoneName.trim(), region: zoneRegion.trim(), chapterCount: 0 });
      }
      setZoneModal(false);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save zone.');
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      if (deleteItem.type === 'chapter') await deleteChapter(deleteItem.id);
      else await deleteZone(deleteItem.id);
      setDeleteItem(null);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete.');
    }
  };

  const chapterColumns = [
    { key: 'name', label: 'Chapter Name', sortable: true, width: 200 },
    {
      key: 'location',
      label: 'Location',
      width: 180,
      render: (item: Chapter) => (
        <Text style={styles.cellText}>{item.location?.city}, {item.location?.state}</Text>
      ),
    },
    {
      key: 'zoneId',
      label: 'Zone',
      width: 150,
      render: (item: Chapter) => {
        const zone = zones.find((z) => z.id === item.zoneId);
        return <Text style={styles.cellText}>{zone?.name || '—'}</Text>;
      },
    },
    { key: 'memberCount', label: 'Members', sortable: true, width: 100 },
  ];

  const zoneColumns = [
    { key: 'name', label: 'Zone Name', sortable: true, width: 200 },
    { key: 'region', label: 'Region', sortable: true, width: 200 },
    { key: 'chapterCount', label: 'Chapters', sortable: true, width: 100 },
  ];

  return (
    <AdminLayout title="Chapters & Zones" activeScreen="AdminChapters">
      {/* Chapters Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Chapters</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openChapterForm()} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Add Chapter</Text>
        </TouchableOpacity>
      </View>
      <AdminDataTable
        columns={chapterColumns}
        data={chapters}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No chapters found"
        actions={(item) => (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => openChapterForm(item)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteItem({ type: 'chapter', id: item.id, name: item.name })} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Zones Section */}
      <View style={[styles.sectionHeader, { marginTop: ADMIN_LAYOUT.sectionGap }]}>
        <Text style={styles.sectionTitle}>Zones</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openZoneForm()} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Add Zone</Text>
        </TouchableOpacity>
      </View>
      <AdminDataTable
        columns={zoneColumns}
        data={zones}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No zones found"
        actions={(item) => (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => openZoneForm(item)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteItem({ type: 'zone', id: item.id, name: item.name })} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Chapter Modal */}
      <AdminModal
        visible={chapterModal}
        title={editChapter ? 'Edit Chapter' : 'Add Chapter'}
        confirmLabel="Save"
        onConfirm={handleSaveChapter}
        onCancel={() => setChapterModal(false)}
      >
        <AdminFormField label="Chapter Name" value={chapterName} onChangeText={setChapterName} placeholder="Enter chapter name" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AdminFormField label="City" value={chapterCity} onChangeText={setChapterCity} placeholder="City" />
          </View>
          <View style={{ flex: 1 }}>
            <AdminFormField label="State" value={chapterState} onChangeText={setChapterState} placeholder="State" />
          </View>
        </View>
      </AdminModal>

      {/* Zone Modal */}
      <AdminModal
        visible={zoneModal}
        title={editZone ? 'Edit Zone' : 'Add Zone'}
        confirmLabel="Save"
        onConfirm={handleSaveZone}
        onCancel={() => setZoneModal(false)}
      >
        <AdminFormField label="Zone Name" value={zoneName} onChangeText={setZoneName} placeholder="Enter zone name" />
        <AdminFormField label="Region" value={zoneRegion} onChangeText={setZoneRegion} placeholder="Enter region" />
      </AdminModal>

      {/* Delete Modal */}
      <AdminModal
        visible={!!deleteItem}
        title="Confirm Delete"
        message={`Are you sure you want to delete "${deleteItem?.name}"?`}
        confirmLabel="Delete"
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </AdminLayout>
  );
};

export default AdminChaptersScreen;

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ADMIN_LAYOUT.elementGap,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  addButtonText: {
    ...typography.captionMedium,
    color: colors.textInverse,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cellText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
