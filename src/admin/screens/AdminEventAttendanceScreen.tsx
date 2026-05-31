import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminDropdownField } from '../components/ui/AdminFormField';
import { AdminModal } from '../components/ui/AdminModal';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { QrCode } from '../../components/ui/QrCode';
import { ADMIN_LAYOUT } from '../constants/layout';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { useAuthStore } from '../../stores/authStore';
import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import type { Event, EventCheckInSource, EventCheckInStatus, User } from '../../types';
import type { AdminStackParamList } from '../types/admin';
import {
  formatAttendanceDisplay,
  formatAttendanceLocalInput,
  parseAttendanceLocalInput,
  saveEventCheckInRecord,
} from '../services/attendanceAdmin';

type Props = StackScreenProps<AdminStackParamList, 'AdminEventAttendance'>;

type AttendanceRow = {
  uid: string;
  name: string;
  phone: string;
  email: string;
  status: EventCheckInStatus;
  recordedAt?: string;
  updatedAt?: string;
  source?: EventCheckInSource;
};

const STATUS_OPTIONS: Array<{ key: EventCheckInStatus; label: string }> = [
  { key: 'present', label: 'Present' },
  { key: 'late', label: 'Late' },
  { key: 'absent', label: 'Absent' },
];

const STATUS_COLORS: Record<EventCheckInStatus, string> = {
  present: colors.success,
  late: colors.warning,
  absent: colors.error,
};

const SOURCE_COLORS = {
  scanner: colors.info,
  manual: colors.warning,
  self: colors.primary,
} as const;

const isWeb = Platform.OS === 'web';
const LATE_THRESHOLD_MINUTES = 15;

function getEventStartMs(event: Event): number | null {
  const datePart = String(event.date || '').split('T')[0];
  const timePart = String(event.time || '').trim();
  if (!datePart || !timePart) return null;
  const start = new Date(`${datePart}T${timePart}:00`);
  const ms = start.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function computeStatusFromRecordedAt(event: Event, recordedAtIso: string): EventCheckInStatus {
  const startMs = getEventStartMs(event);
  const recordedMs = new Date(recordedAtIso).getTime();
  if (!startMs || Number.isNaN(recordedMs)) return 'present';
  const diff = recordedMs - startMs;
  return diff > LATE_THRESHOLD_MINUTES * 60 * 1000 ? 'late' : 'present';
}

function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();

  if (isWeb) {
    return (
      <View style={styles.pickerContainer}>
        <Ionicons name="calendar-outline" size={18} color={value ? colors.primary : colors.textTertiary} style={styles.pickerIcon} />
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
      <TouchableOpacity onPress={() => setShow(true)} activeOpacity={0.8} style={styles.pickerContainer}>
        <Ionicons name="calendar-outline" size={18} color={value ? colors.primary : colors.textTertiary} style={styles.pickerIcon} />
        <Text style={{ flex: 1, color: value ? colors.text : colors.textTertiary }}>{value || 'YYYY-MM-DD'}</Text>
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

function TimePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
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
        <Ionicons name="time-outline" size={18} color={value ? colors.primary : colors.textTertiary} style={styles.pickerIcon} />
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
      <TouchableOpacity onPress={() => setShow(true)} activeOpacity={0.8} style={styles.pickerContainer}>
        <Ionicons name="time-outline" size={18} color={value ? colors.primary : colors.textTertiary} style={styles.pickerIcon} />
        <Text style={{ flex: 1, color: value ? colors.text : colors.textTertiary }}>{value || 'HH:MM'}</Text>
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

const AdminEventAttendanceScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const currentAdmin = useAuthStore((s) => s.user);
  const { items: events, loading: eventsLoading } = useRealtimeCollection<Event>('events');
  const { items: users, loading: usersLoading } = useRealtimeCollection<User>('users', 'uid');

  const event = useMemo(
    () => events.find((item) => item.id === eventId) ?? null,
    [eventId, events],
  );

  const [editingRow, setEditingRow] = useState<AttendanceRow | null>(null);
  const [editStatus, setEditStatus] = useState<EventCheckInStatus>('present');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [autoStatusHint, setAutoStatusHint] = useState('');

  const attendanceRows = useMemo<AttendanceRow[]>(() => {
    if (!event) return [];
    const candidateIds = new Set<string>([
      ...(event.attendees || []),
      ...Object.keys(event.attendanceRecords || {}),
    ]);

    return Array.from(candidateIds)
      .map((uid) => {
        const record = event.attendanceRecords?.[uid];
        const matchedUser = users.find((user) => user.uid === uid);
        return {
          uid,
          name: record?.userName || matchedUser?.name || uid,
          phone: record?.userPhone || matchedUser?.phone || '',
          email: record?.userEmail || matchedUser?.email || '',
          status: record?.status || 'absent',
          recordedAt: record?.recordedAt,
          updatedAt: record?.updatedAt,
          source: record?.source,
        };
      })
      .sort((a, b) => {
        const aTime = a.recordedAt || '';
        const bTime = b.recordedAt || '';
        if (aTime && bTime) return bTime.localeCompare(aTime);
        if (aTime) return -1;
        if (bTime) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [event, users]);

  const presentCount = event?.checkedInUsers?.length || 0;
  const totalRecords = attendanceRows.filter((row) => !!row.recordedAt).length;
  const expectedCount = event?.attendees?.length || 0;
  const eventQrValue = `netconnect:event-checkin:${eventId}`;

  const openEditModal = (row: AttendanceRow) => {
    setEditingRow(row);
    const local = formatAttendanceLocalInput(row.recordedAt || new Date().toISOString());
    const [datePart, timePart] = local.split('T');
    setEditDate(datePart || '');
    setEditTime(timePart || '');
    setEditStatus(row.status);
    setEditError('');
    setAutoStatusHint('');
  };

  const handleEditSave = async () => {
    if (!event || !editingRow) return;
    const recordedAt = parseAttendanceLocalInput(`${editDate}T${editTime}`);
    if (!recordedAt) {
      setEditError('Select a valid date and time.');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');
    try {
      const computedStatus = computeStatusFromRecordedAt(event, recordedAt);
      if (editStatus !== 'absent' && computedStatus !== editStatus) {
        setEditStatus(computedStatus);
        setAutoStatusHint(`Recorded time indicates ${computedStatus.toUpperCase()} (auto-adjusted). Click Save again to confirm.`);
        return;
      }

      const nextStatus = editStatus === 'absent' ? 'absent' : computedStatus;
      await saveEventCheckInRecord({
        eventId: event.id,
        user: {
          uid: editingRow.uid,
          name: editingRow.name,
          phone: editingRow.phone,
          email: editingRow.email,
        },
        status: nextStatus,
        recordedAt,
        source: 'manual',
        updatedBy: currentAdmin?.uid,
      });
      setEditingRow(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update attendance.';
      setEditError(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Member',
      sortable: true,
      width: 220,
      render: (item: AttendanceRow) => (
        <View>
          <Text style={styles.cellTitle}>{item.name}</Text>
          <Text style={styles.cellSubtext}>{item.email || item.uid}</Text>
        </View>
      ),
    },
    {
      key: 'phone',
      label: 'Contact',
      width: 150,
      render: (item: AttendanceRow) => (
        <Text style={styles.cellText}>{item.phone || '—'}</Text>
      ),
    },
    {
      key: 'status',
      label: 'Attendance',
      width: 120,
      render: (item: AttendanceRow) => (
        <AdminStatusBadge
          label={item.status === 'present' ? 'Present' : item.status === 'late' ? 'Late' : 'Absent'}
          color={STATUS_COLORS[item.status]}
        />
      ),
    },
    {
      key: 'recordedAt',
      label: 'Recorded At',
      sortable: true,
      width: 170,
      render: (item: AttendanceRow) => (
        <Text style={styles.cellText}>{formatAttendanceDisplay(item.recordedAt)}</Text>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      width: 110,
      render: (item: AttendanceRow) => (
        item.source ? (
          <AdminStatusBadge
            label={item.source === 'scanner' ? 'QR Scan' : item.source === 'self' ? 'Self' : 'Manual'}
            color={SOURCE_COLORS[item.source]}
          />
        ) : (
          <Text style={styles.cellSubtext}>Pending</Text>
        )
      ),
    },
  ];

  if (eventsLoading) {
    return (
      <AdminLayout
        title="Event Attendance"
        activeScreen="AdminEventAttendanceList"
        showBackButton
        onBack={() => navigation.goBack()}
      >
        <View style={styles.emptyState}>
          <Ionicons name="hourglass-outline" size={28} color={colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>Loading attendance</Text>
          <Text style={styles.emptyStateText}>Fetching event and member data.</Text>
        </View>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout
        title="Event Attendance"
        activeScreen="AdminEventAttendanceList"
        showBackButton
        onBack={() => navigation.goBack()}
      >
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={28} color={colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>Event not found</Text>
          <Text style={styles.emptyStateText}>The selected event could not be loaded.</Text>
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Attendance · ${event.title}`}
      activeScreen="AdminEventAttendanceList"
      showBackButton
      onBack={() => navigation.goBack()}
    >
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Present</Text>
          <Text style={styles.summaryValue}>{presentCount}</Text>
          <Text style={styles.summaryHint}>Members who marked themselves present</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Records</Text>
          <Text style={styles.summaryValue}>{totalRecords}</Text>
          <Text style={styles.summaryHint}>Editable attendance entries</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>RSVP</Text>
          <Text style={styles.summaryValue}>{expectedCount}</Text>
          <Text style={styles.summaryHint}>Members marked attending</Text>
        </View>
      </View>

      <View style={styles.qrCard}>
        <View style={styles.qrHeader}>
          <View style={styles.qrTextWrap}>
            <Text style={styles.sectionTitle}>Event Attendance QR</Text>
            <Text style={styles.sectionHint}>
              Show this event QR to attendees. They will scan it from their own event details screen to mark attendance.
            </Text>
          </View>
          <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.qrCodeWrap}>
          <QrCode value={eventQrValue} size={220} />
        </View>
        <Text style={styles.qrMeta}>{event.title}</Text>
        <Text style={styles.qrMetaSub}>{eventId}</Text>
      </View>

      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <View>
            <Text style={styles.sectionTitle}>Attendance Records</Text>
            <Text style={styles.sectionHint}>Users mark attendance themselves from the event QR. You can review and edit any row here later.</Text>
          </View>
        </View>

        <AdminDataTable
          columns={columns}
          data={attendanceRows}
          keyExtractor={(item) => item.uid}
          emptyMessage="No attendees or attendance records yet"
          loading={usersLoading}
          onRowPress={openEditModal}
          actions={(item) => (
            <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        />
      </View>

      <AdminModal
        visible={!!editingRow}
        title={editingRow ? `Edit Attendance · ${editingRow.name}` : 'Edit Attendance'}
        confirmLabel={isSavingEdit ? 'Saving...' : 'Save'}
        onConfirm={handleEditSave}
        onCancel={() => {
          if (isSavingEdit) return;
          setEditingRow(null);
          setEditError('');
        }}
      >
        {editingRow ? (
          <View>
            <AdminDropdownField
              label="Status"
              value={editStatus}
              options={STATUS_OPTIONS}
              onSelect={(value) => {
                setEditStatus(value as EventCheckInStatus);
                if (editError) setEditError('');
              }}
            />
            <Text style={styles.editLabel}>Recorded date</Text>
            <DatePickerField
              value={editDate}
              onChange={(value) => {
                setEditDate(value);
                if (autoStatusHint) setAutoStatusHint('');
                if (editError) setEditError('');
              }}
            />
            <Text style={styles.editLabel}>Recorded time</Text>
            <TimePickerField
              value={editTime}
              onChange={(value) => {
                setEditTime(value);
                if (autoStatusHint) setAutoStatusHint('');
                if (editError) setEditError('');
              }}
            />
            {editError ? <Text style={styles.errorText}>{editError}</Text> : null}
            {autoStatusHint ? <Text style={styles.hintText}>{autoStatusHint}</Text> : null}
          </View>
        ) : null}
      </AdminModal>
    </AdminLayout>
  );
};

export default AdminEventAttendanceScreen;

const styles = StyleSheet.create({
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 52,
    marginBottom: spacing.sm,
  },
  pickerIcon: {
    marginLeft: spacing.lg,
    marginRight: spacing.sm,
  },
  editLabel: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: ADMIN_LAYOUT.sectionGap,
  },
  summaryCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    ...shadows.sm,
  },
  summaryLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },
  summaryHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: ADMIN_LAYOUT.sectionGap,
    ...shadows.sm,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  qrTextWrap: {
    flex: 1,
  },
  qrCodeWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrMeta: {
    ...typography.bodySmallMedium,
    color: colors.text,
    textAlign: 'center',
  },
  qrMetaSub: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
  tableSection: {
    marginBottom: ADMIN_LAYOUT.sectionGap,
  },
  tableHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  cellTitle: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  cellSubtext: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs / 2,
  },
  cellText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  emptyState: {
    width: '100%',
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyStateTitle: {
    ...typography.h4,
    color: colors.text,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
