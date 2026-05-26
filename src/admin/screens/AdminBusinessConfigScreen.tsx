import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDropdownField } from '../components/ui/AdminFormField';
import { AdminChipsInput } from '../components/ui/AdminChipsInput';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getBusinessConfigAdmin, updateBusinessConfigAdmin } from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { BusinessConfig } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminBusinessConfig'>;

const AdminBusinessConfigScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, string[]>>({});
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, string[]>>({});

  const currentServices = servicesByCategory[selectedCategory] || [];
  const currentTags = tagsByCategory[selectedCategory] || [];

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategory('');
      return;
    }
    if (!selectedCategory || !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    const load = async () => {
      try {
        const config = await getBusinessConfigAdmin();
        setCategories(config.businessCategories || []);
        setServicesByCategory(config.servicesByCategory || {});
        setTagsByCategory(config.tagsByCategory || {});
        const first = (config.businessCategories || [])[0] || '';
        setSelectedCategory(first);
      } catch {
        Alert.alert('Error', 'Failed to load business config.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleServicesChange = (newServices: string[]) => {
    if (!selectedCategory) return;
    setServicesByCategory((prev) => ({
      ...prev,
      [selectedCategory]: newServices,
    }));
  };

  const handleTagsChange = (newTags: string[]) => {
    if (!selectedCategory) return;
    setTagsByCategory((prev) => ({
      ...prev,
      [selectedCategory]: newTags,
    }));
  };

  const handleSave = async () => {
    if (categories.length === 0) {
      Alert.alert('Error', 'Add at least one business category.');
      return;
    }

    const nextServicesByCategory: Record<string, string[]> = {};
    const nextTagsByCategory: Record<string, string[]> = {};
    categories.forEach((category) => {
      nextServicesByCategory[category] = servicesByCategory[category] || [];
      nextTagsByCategory[category] = tagsByCategory[category] || [];
    });

    const payload: BusinessConfig = {
      businessCategories: categories,
      popularTags: [],
      servicesByCategory: nextServicesByCategory,
      tagsByCategory: nextTagsByCategory,
    };

    setSaving(true);
    try {
      await updateBusinessConfigAdmin(payload);
      Alert.alert('Success', 'Business config updated.');
    } catch {
      Alert.alert('Error', 'Failed to save business config.');
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = categories.map((category) => ({ key: category, label: category }));

  return (
    <AdminLayout
      title="Business Config"
      activeScreen="AdminBusinessConfig"
      showBackButton
      onBack={() => navigation.goBack()}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.hint}>
          Manage categories, services, and tags used by Register/Edit Profile screens.
        </Text>

        <AdminChipsInput
          label="Business Categories"
          values={categories}
          onChange={setCategories}
          placeholder="Type and press Enter to add"
        />

        <View style={styles.divider} />

        <AdminDropdownField
          label="Category of Services"
          value={selectedCategory}
          options={categoryOptions}
          onSelect={(value) => setSelectedCategory(value)}
          placeholder="Select category"
        />

        {selectedCategory && (
          <>
            <AdminChipsInput
              label={`Services for "${selectedCategory}"`}
              values={currentServices}
              onChange={handleServicesChange}
              placeholder="Type and press Enter to add"
            />

            <AdminChipsInput
              label={`Tags for "${selectedCategory}"`}
              values={currentTags}
              onChange={handleTagsChange}
              placeholder="Type and press Enter to add"
            />
          </>
        )}

        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving || loading}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Config'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </AdminLayout>
  );
};

export default AdminBusinessConfigScreen;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: ADMIN_LAYOUT.elementGap,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: ADMIN_LAYOUT.elementGap,
  },
  saveButton: {
    marginTop: ADMIN_LAYOUT.sectionGap,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
});
