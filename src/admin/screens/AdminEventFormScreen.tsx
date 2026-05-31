import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { AdminSidebar } from '../components/layout/AdminSidebar';
import {
  AdminFormField,
  AdminDropdownField,
  AdminMultiSelectDropdownField,
} from '../components/ui/AdminFormField';
import { AdminImageUpload } from '../components/ui/AdminImageUpload';

import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';

import {
  createEventAdmin,
  updateEventAdmin,
  getAllEventsAdmin,
} from '../services/adminFirestore';

import {
  uploadEventImage,
  uploadAdminEventImage,
} from '../../services/firebase/storage';

import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import {
  getEventAudienceChapterIds,
  isCentralEvent,
} from '../../utils/eventAudience';

import type { AdminStackParamList } from '../types/admin';
import type { Chapter, Event } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminEventForm'>;

const Sidebar = React.memo(AdminSidebar);
const isWeb = Platform.OS === 'web';

function isValidChapter(chapter: Chapter | null | undefined): boolean {
  return !!chapter?.id && !!String(chapter.name || '').trim();
}

function DatePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();

  if (isWeb) {
    return (
      <View style={styles.pickerContainer}>
        <Ionicons
          name="calendar-outline"
          size={18}
          color={value ? colors.primary : colors.textTertiary}
          style={styles.pickerIcon}
        />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: 16,
            color: value ? '#0F172A' : '#9CA3AF',
            fontFamily: 'inherit',
            padding: '12px 16px 12px 0',
            cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) {
      setShow(false);
      return;
    }
    setShow(Platform.OS === 'ios');
    onChange(date.toISOString().split('T')[0]);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.8}
        style={styles.pickerContainer}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={value ? colors.primary : colors.textTertiary}
          style={styles.pickerIcon}
        />
        <Text style={{ flex: 1, color: value ? colors.text : colors.textTertiary }}>
          {value || 'YYYY-MM-DD'}
        </Text>
      </TouchableOpacity>
      {show ? (
        <DateTimePicker
          value={initialDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

function TimePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const parseTime = (timeValue: string) => {
    const [h, m] = timeValue.split(':').map(Number);
    const d = new Date();
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      d.setHours(h);
      d.setMinutes(m);
      d.setSeconds(0);
      d.setMilliseconds(0);
    }
    return d;
  };
  const initialDate = value ? parseTime(value) : new Date();

  if (isWeb) {
    return (
      <View style={styles.pickerContainer}>
        <Ionicons
          name="time-outline"
          size={18}
          color={value ? colors.primary : colors.textTertiary}
          style={styles.pickerIcon}
        />
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: 16,
            color: value ? '#0F172A' : '#9CA3AF',
            fontFamily: 'inherit',
            padding: '12px 16px 12px 0',
            cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) {
      setShow(false);
      return;
    }
    setShow(Platform.OS === 'ios');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.8}
        style={styles.pickerContainer}
      >
        <Ionicons
          name="time-outline"
          size={18}
          color={value ? colors.primary : colors.textTertiary}
          style={styles.pickerIcon}
        />
        <Text style={{ flex: 1, color: value ? colors.text : colors.textTertiary }}>
          {value || 'HH:MM'}
        </Text>
      </TouchableOpacity>
      {show ? (
        <DateTimePicker
          value={initialDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const AdminEventFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const isEdit = !!eventId;

  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
  const availableChapters = useMemo(
    () => chapters.filter((chapter) => isValidChapter(chapter)),
    [chapters],
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'meeting' | 'event' | 'webinar'>('event');
  const [organizerName, setOrganizerName] = useState('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [imageURL, setImageURL] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedEvent, setLoadedEvent] = useState<Event | null>(null);
  const [audienceInitialized, setAudienceInitialized] = useState(false);

  // Load event
  useEffect(() => {
    if (isEdit && eventId) loadEvent(eventId);
  }, [eventId]);

  // Initialize audience
  useEffect(() => {
    if (audienceInitialized || !availableChapters.length) return;

    if (!isEdit) {
      setSelectedChapterIds(availableChapters.map((c) => c.id));
      setAudienceInitialized(true);
      return;
    }

    if (!loadedEvent) return;

    if (isCentralEvent(loadedEvent)) {
      setSelectedChapterIds(availableChapters.map((c) => c.id));
    } else {
      const valid = new Set(availableChapters.map((c) => c.id));
      setSelectedChapterIds(
        getEventAudienceChapterIds(loadedEvent).filter((id) =>
          valid.has(id)
        )
      );
    }

    setAudienceInitialized(true);
  }, [availableChapters, loadedEvent, isEdit, audienceInitialized]);

  const loadEvent = async (id: string) => {
    try {
      const events = await getAllEventsAdmin();
      const event = events.find((e) => e.id === id);
      if (!event) return;

      setLoadedEvent(event);
      setTitle(event.title);
      setDescription(event.description);
      setDate(event.date.split('T')[0]);
      setTime(event.time);
      setLocation(event.location);
      setType(event.type);
      setOrganizerName(event.organizerName);
      setImageURL(event.imageURL || '');
      setLocalImageUri(null);
      setAudienceInitialized(false);
    } catch {
      Alert.alert('Error', 'Failed to load event.');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Error', 'Title, date, and time are required.');
      return;
    }

    if (availableChapters.length === 0) {
      Alert.alert('Error', 'Create at least one chapter before creating an event.');
      return;
    }

    const uniqueIds = Array.from(
      new Set(
        selectedChapterIds.map((id) => String(id || '').trim()).filter(Boolean)
      )
    );

    const validIds = new Set(availableChapters.map((c) => c.id));
    const syncedIds = uniqueIds.filter((id) => validIds.has(id));
    const allIds = availableChapters.map((c) => c.id);

    const isAll =
      syncedIds.length === allIds.length;

    if (!isAll && syncedIds.length === 0) {
      Alert.alert('Error', 'Select at least one chapter.');
      return;
    }

    try {
      setSaving(true);

      let finalImageURL = imageURL.trim();

      if (localImageUri) {
        finalImageURL =
          isEdit && eventId
            ? await uploadEventImage(eventId, localImageUri)
            : await uploadAdminEventImage(localImageUri);
      }

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date: date.trim() + 'T00:00:00Z',
        time: time.trim(),
        location: location.trim(),
        type,
        organizer: '',
        organizerName: organizerName.trim(),
        chapterId: isAll ? 'all' : syncedIds[0],
        chapterIds: isAll ? allIds : syncedIds,
        imageURL: finalImageURL,
      };

      if (isEdit && eventId) {
        await updateEventAdmin(eventId, eventData);
        Alert.alert('Success', 'Event updated.', [
          {
            text: 'OK',
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'AdminEvents' as any }],
              }),
          },
        ]);
      } else {
        await createEventAdmin(eventData);
        Alert.alert('Success', 'Event created.', [
          {
            text: 'OK',
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'AdminEvents' as any }],
              }),
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const typeOptions = [
    { key: 'meeting', label: 'Meeting' },
    { key: 'event', label: 'Event' },
    { key: 'webinar', label: 'Webinar' },
  ];

  const chapterOptions = useMemo(
    () => availableChapters.map((c) => ({ key: c.id, label: c.name })),
    [availableChapters]
  );

  const audienceSummary = useMemo(() => {
    return chapterOptions.length &&
      selectedChapterIds.length === chapterOptions.length
      ? 'Central (All Chapters)'
      : '';
  }, [chapterOptions.length, selectedChapterIds.length]);

  return (
    <View style={styles.root}>
      <Sidebar
        activeScreen="AdminEvents"
        onNavigate={(screen) => navigation.navigate(screen as any)}
        onLogout={() =>
          Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Logout',
              style: 'destructive',
              onPress: () =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' as any }],
                }),
            },
          ])
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.container}>
          <AdminFormField label="Event Title *" value={title} onChangeText={setTitle} />
          <AdminFormField label="Description" value={description} onChangeText={setDescription} multiline />

          <View style={styles.row}>
            <View style={styles.colLeft}>
              <AdminDropdownField
                label="Event Type"
                value={type}
                options={typeOptions}
                onSelect={(v) => setType(v as any)}
              />
            </View>

            <View style={styles.colRight}>
              <AdminMultiSelectDropdownField
                label="Audience"
                values={selectedChapterIds}
                options={chapterOptions}
                onChange={setSelectedChapterIds}
              />
            </View>
          </View>

          {audienceSummary ? (
            <Text style={styles.audienceHint}>{audienceSummary}</Text>
          ) : null}

          <View style={styles.row}>
            <View style={styles.colLeft}>
              <Text style={styles.fieldLabel}>Date *</Text>
              <DatePickerField value={date} onChange={setDate} />
            </View>

            <View style={styles.colRight}>
              <Text style={styles.fieldLabel}>Time *</Text>
              <TimePickerField value={time} onChange={setTime} />
            </View>
          </View>

          <AdminFormField label="Location" value={location} onChangeText={setLocation} multiline numberOfLines={3} />
          <AdminFormField label="Organizer Name" value={organizerName} onChangeText={setOrganizerName} />

          <AdminImageUpload
            label="Event Image (Recommended 1600×900, 16:9)"
            imageSource={localImageUri || imageURL}
            onImageSelected={setLocalImageUri}
            onRemove={() => {
              setLocalImageUri(null);
              setImageURL('');
            }}
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default AdminEventFormScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
    overflow: 'hidden',
    minWidth: 1200,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingVertical: 20,
    minWidth: 900, // ✅ prevents shrink → removes jitter
  },

  container: {
    width: 900,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },

  row: {
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
  },

  colLeft: {
    flex: 1,
    marginRight: 8,
  },

  colRight: {
    flex: 1,
    marginLeft: 8,
  },

  audienceHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  fieldLabel: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
    marginBottom: spacing.xs,
  },

  pickerIcon: {
    marginLeft: spacing.lg,
    marginRight: spacing.sm,
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
