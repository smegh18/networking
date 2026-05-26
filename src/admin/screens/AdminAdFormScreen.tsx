import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDropdownField, AdminFormField } from '../components/ui/AdminFormField';
import { AdminSearchableDropdown } from '../components/ui/AdminSearchableDropdown';
import { AdminImageUpload } from '../components/ui/AdminImageUpload';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { createAd, updateAd, getAllAds, getAllEventsAdmin, getAllUsersAdmin } from '../services/adminFirestore';
import { uploadAdImage, uploadAdminAdImage } from '../../services/firebase/storage';
import type { AdminStackParamList } from '../types/admin';
import type { Event, User } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminAdForm'>;

const AdminAdFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const adId = route.params?.adId;
  const isEdit = !!adId;

  const [targetType, setTargetType] = useState<'user' | 'event'>('user');
  const [targetId, setTargetId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTargets();
    if (isEdit && adId) {
      loadAd(adId);
    }
  }, [adId]);

  const loadTargets = async () => {
    try {
      const [usersData, eventsData] = await Promise.all([
        getAllUsersAdmin(),
        getAllEventsAdmin(),
      ]);
      setUsers(usersData);
      setEvents(eventsData);
    } catch {
      // Non-fatal. Admin can still edit text fields even if dropdowns fail to load.
    }
  };

  const loadAd = async (id: string) => {
    try {
      const ads = await getAllAds();
      const ad = ads.find((a) => a.id === id);
      if (ad) {
        setTitle(ad.title);
        setDescription(ad.description);
        setBusinessName(ad.businessName);
        setImageURL(ad.imageURL || '');
        setLocalImageUri(null);
        setExpiresAt(ad.expiresAt?.split('T')[0] || '');
        const type = (ad.targetType === 'event' ? 'event' : 'user') as 'user' | 'event';
        setTargetType(type);
        setTargetId((ad.targetId || ad.userId || '').trim());
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load ad.');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !businessName.trim()) {
      Alert.alert('Error', 'Title and Business Name are required.');
      return;
    }
    if (!targetId.trim()) {
      Alert.alert('Error', targetType === 'event' ? 'Please select an event for this banner.' : 'Please select a user for this banner.');
      return;
    }

    try {
      setSaving(true);
      let finalImageURL = imageURL.trim();

      if (localImageUri) {
        if (isEdit && adId) {
          finalImageURL = await uploadAdImage(adId, localImageUri);
        } else {
          finalImageURL = await uploadAdminAdImage(localImageUri);
        }
      }

      const finalTargetId = targetId.trim();
      const adData = {
        title: title.trim(),
        description: description.trim(),
        businessName: businessName.trim(),
        imageURL: finalImageURL,
        userId: targetType === 'user' ? finalTargetId : '',
        targetType,
        targetId: finalTargetId,
        active: true,
        expiresAt: expiresAt ? expiresAt.trim() + 'T23:59:59Z' : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      if (isEdit && adId) {
        await updateAd(adId, adData);
        Alert.alert('Success', 'Ad updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await createAd(adData);
        Alert.alert('Success', 'Ad created.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save ad.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={isEdit ? 'Edit Ad' : 'Create Ad'}
      activeScreen="AdminAds"
      showBackButton
      onBack={() => navigation.goBack()}
    >
      <View style={styles.formContainer}>
        <AdminDropdownField
          label="Banner For *"
          value={targetType}
          options={[
            { key: 'user', label: 'User / Business Profile' },
            { key: 'event', label: 'Event' },
          ]}
          onSelect={(value) => {
            setTargetType(value as 'user' | 'event');
            setTargetId('');
          }}
        />

        {targetType === 'user' ? (
          <AdminSearchableDropdown
            label="Target User *"
            value={targetId}
            options={users.map((u) => ({ key: u.uid, label: `${u.name} (${u.businessName || 'Business'})` }))}
            onSelect={(uid) => {
              setTargetId(uid);
              const u = users.find((x) => x.uid === uid);
              if (u && !businessName.trim()) setBusinessName(u.businessName || u.name || '');
            }}
            placeholder="Search and select user..."
          />
        ) : (
          <AdminSearchableDropdown
            label="Target Event *"
            value={targetId}
            options={events.map((e) => ({ key: e.id, label: `${e.title} (${(e.date || '').slice(0, 10)})` }))}
            onSelect={(eventId) => {
              setTargetId(eventId);
              const e = events.find((x) => x.id === eventId);
              if (e && !businessName.trim()) setBusinessName(e.title || 'Event');
            }}
            placeholder="Search and select event..."
          />
        )}

        <AdminFormField label="Ad Title *" value={title} onChangeText={setTitle} placeholder="Enter ad title" icon="megaphone-outline" />
        <AdminFormField label="Business Name *" value={businessName} onChangeText={setBusinessName} placeholder="Business name" icon="briefcase-outline" />
        <AdminFormField label="Description" value={description} onChangeText={setDescription} placeholder="Ad description" multiline numberOfLines={3} />
        <AdminImageUpload
          label="Ad Image"
          imageSource={localImageUri || imageURL}
          onImageSelected={(uri) => setLocalImageUri(uri)}
          onRemove={() => {
            setLocalImageUri(null);
            setImageURL('');
          }}
          uploading={saving && !!localImageUri}
        />
        <AdminFormField label="Expires (YYYY-MM-DD)" value={expiresAt} onChangeText={setExpiresAt} placeholder="2026-12-31" icon="calendar-outline" />

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : isEdit ? 'Update Ad' : 'Create Ad'}</Text>
        </TouchableOpacity>
      </View>
    </AdminLayout>
  );
};

export default AdminAdFormScreen;

const styles = StyleSheet.create({
  formContainer: {
    width: '100%',
    maxWidth: 720,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: ADMIN_LAYOUT.sectionGap,
  },
  saveButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
});
