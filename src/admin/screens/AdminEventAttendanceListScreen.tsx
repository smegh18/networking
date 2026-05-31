import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminTabFilter } from '../components/ui/AdminTabFilter';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { getAllEventsAdmin } from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { Event } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminEventAttendanceList'>;

const TYPE_COLORS: Record<string, string> = {
  meeting: '#3B82F6',
  event: '#8B5CF6',
  webinar: '#10B981',
};

const AdminEventAttendanceListScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    void loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getAllEventsAdmin();
      setEvents(data);
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

  const columns = [
    { key: 'title', label: 'Title', sortable: true, width: 260 },
    {
      key: 'type',
      label: 'Type',
      width: 120,
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
      width: 150,
      render: (item: Event) => (
        <Text style={styles.cellText}>
          {item.date
            ? new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
            : '-'}
        </Text>
      ),
    },
    { key: 'time', label: 'Time', width: 110 },
    {
      key: 'attendees',
      label: 'Attendees',
      width: 110,
      render: (item: Event) => <Text style={styles.cellText}>{item.attendees?.length || 0}</Text>,
    },
    {
      key: 'present',
      label: 'Present',
      width: 90,
      render: (item: Event) => <Text style={styles.cellText}>{item.checkedInUsers?.length || 0}</Text>,
    },
  ];

  return (
    <AdminLayout title="Event Attendance" activeScreen="AdminEventAttendanceList">
      <View style={styles.topBar}>
        <AdminTabFilter tabs={tabs} activeKey={activeTab} onSelect={setActiveTab} />
        <TouchableOpacity style={styles.refreshButton} onPress={loadEvents} activeOpacity={0.7}>
          <Ionicons name="refresh" size={18} color={colors.textInverse} />
          <Text style={styles.refreshButtonText}>Refresh</Text>
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
          </View>
        )}
      />
    </AdminLayout>
  );
};

export default AdminEventAttendanceListScreen;

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ADMIN_LAYOUT.sectionGap,
    flexWrap: 'wrap',
    gap: ADMIN_LAYOUT.elementGap,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  refreshButtonText: {
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

