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
  createChapter,
  updateChapter,
  deleteChapter,
} from '../services/adminFirestore';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { AdminStackParamList } from '../types/admin';
import type { Chapter } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminChapters'>;

const AdminChaptersScreen: React.FC<Props> = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const { isGlobalAdmin, user: adminUser } = useAdminAuth();

  // Chapter form
  const [chapterModal, setChapterModal] = useState(false);
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);
  const [chapterName, setChapterName] = useState('');
  const [chapterCity, setChapterCity] = useState('');
  const [chapterState, setChapterState] = useState('');

  // Delete
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      let chaptersData = await getAllChapters();
      if (!isGlobalAdmin && adminUser?.chapterId) {
        chaptersData = chaptersData.filter(c => c.id === adminUser.chapterId);
      }
      setChapters(chaptersData);
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
    } else {
      setEditChapter(null);
      setChapterName('');
      setChapterCity('');
      setChapterState('');
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
          location: { city: chapterCity.trim(), state: chapterState.trim() },
        });
      } else {
        await createChapter({
          name: chapterName.trim(),
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

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await deleteChapter(deleteItem.id);
      setDeleteItem(null);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete.');
    }
  };

  const chapterColumns = [
    { key: 'name', label: 'Chapter Name', sortable: true, width: 320 },
    {
      key: 'location',
      label: 'Location',
      width: 300,
      render: (item: Chapter) => (
        <Text style={styles.cellText}>{item.location?.city}, {item.location?.state}</Text>
      ),
    },
    { key: 'memberCount', label: 'Members', sortable: true, width: 160 },
  ];

  return (
    <AdminLayout title="Chapters" activeScreen="AdminChapters">
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Chapters</Text>
        {isGlobalAdmin && (
          <TouchableOpacity style={styles.addButton} onPress={() => openChapterForm()} activeOpacity={0.7}>
            <Ionicons name="add" size={18} color={colors.textInverse} />
            <Text style={styles.addButtonText}>Add Chapter</Text>
          </TouchableOpacity>
        )}
      </View>
      <AdminDataTable
        columns={chapterColumns}
        data={chapters}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No chapters found"
        paginate={false}
        fullWidth
        actions={isGlobalAdmin ? (item) => (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => openChapterForm(item)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteItem({ id: item.id, name: item.name })} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : undefined}
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
