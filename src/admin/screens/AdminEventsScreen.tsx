import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminTabFilter } from '../components/ui/AdminTabFilter';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { AdminModal } from '../components/ui/AdminModal';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getAllEventsAdmin, deleteEvent } from '../services/adminFirestore';
import { getEventAudienceLabel } from '../../utils/eventAudience';
import type { AdminStackParamList } from '../types/admin';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import type { Chapter, Event } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminEvents'>;

const TYPE_COLORS: Record<string, string> = {
  meeting: '#3B82F6',
  event: '#8B5CF6',
  webinar: '#10B981',
};

const AdminEventsScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteModal, setDeleteModal] = useState<Event | null>(null);
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getAllEventsAdmin();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    if (activeTab === 'all') return events;
    return events.filter((e) => e.type === activeTab);
  }, [events, activeTab]);

  const tabs = [
    { key: 'all', label: 'All', count: events.length },
    { key: 'meeting', label: 'Meetings', count: events.filter((e) => e.type === 'meeting').length },
    { key: 'event', label: 'Events', count: events.filter((e) => e.type === 'event').length },
    { key: 'webinar', label: 'Webinars', count: events.filter((e) => e.type === 'webinar').length },
  ];

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteEvent(deleteModal.id);
      setDeleteModal(null);
      await loadEvents();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete event.');
    }
  };

  const columns = [
    { key: 'title', label: 'Title', sortable: true, width: 220 },
    {
      key: 'type',
      label: 'Type',
      width: 110,
      render: (item: Event) => (
        <AdminStatusBadge
          label={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          color={TYPE_COLORS[item.type] || colors.primary}
        />
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      width: 140,
      render: (item: Event) => (
        <Text style={styles.cellText}>
          {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    { key: 'time', label: 'Time', width: 100 },
    {
      key: 'audience',
      label: 'Audience',
      width: 220,
      render: (item: Event) => (
        <Text style={styles.cellText}>
          {getEventAudienceLabel(item, chapters)}
        </Text>
      ),
    },
    { key: 'location', label: 'Location', width: 180 },
    { key: 'organizerName', label: 'Organizer', sortable: true, width: 150 },
    {
      key: 'attendees',
      label: 'Attendees',
      width: 100,
      render: (item: Event) => (
        <Text style={styles.cellText}>{item.attendees?.length || 0}</Text>
      ),
    },
    {
      key: 'present',
      label: 'Present',
      width: 90,
      render: (item: Event) => (
        <Text style={styles.cellText}>{item.checkedInUsers?.length || 0}</Text>
      ),
    },
  ];

  return (
    <AdminLayout title="Event Management" activeScreen="AdminEvents">
      <View style={styles.topBar}>
        <AdminTabFilter tabs={tabs} activeKey={activeTab} onSelect={setActiveTab} />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdminEventForm', {})}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.textInverse} />
          <Text style={styles.addButtonText}>Create Event</Text>
        </TouchableOpacity>
      </View>

      <AdminDataTable
        columns={columns}
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="No events found"
        actions={(item) => (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminEventAttendance', { eventId: item.id })}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={18} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminEventForm', { eventId: item.id })}
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
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteModal?.title}"?`}
        confirmLabel="Delete"
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </AdminLayout>
  );
};

export default AdminEventsScreen;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ADMIN_LAYOUT.sectionGap,
    flexWrap: 'wrap',
    gap: ADMIN_LAYOUT.elementGap,
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
  cellText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
