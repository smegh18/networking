import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminFormField, AdminDropdownField } from '../components/ui/AdminFormField';
import { AdminSearchableDropdown } from '../components/ui/AdminSearchableDropdown';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { ADMIN_LAYOUT } from '../constants/layout';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import {
  sendNotificationToUser,
  sendNotificationToChapter,
  sendBroadcastNotification,
  getAllNotificationsAdmin,
  getAllChapters,
  getAllUsersAdmin,
} from '../services/adminFirestore';
import type { AdminStackParamList } from '../types/admin';
import type { AppNotification, Chapter, User } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminNotifications'>;

const AdminNotificationsScreen: React.FC<Props> = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notifType, setNotifType] = useState<AppNotification['type']>('system');
  const [target, setTarget] = useState<'all' | 'chapter' | 'user'>('all');
  const [targetId, setTargetId] = useState('');
  const [sending, setSending] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notifs, chaptersData, usersData] = await Promise.all([
        getAllNotificationsAdmin(),
        getAllChapters(),
        getAllUsersAdmin(),
      ]);
      setNotifications(notifs.slice(0, 50));
      setChapters(chaptersData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Error', 'Title and body are required.');
      return;
    }
    if ((target === 'chapter' || target === 'user') && !targetId) {
      Alert.alert('Error', 'Please select a target.');
      return;
    }

    try {
      setSending(true);
      const notification = { type: notifType, title: title.trim(), body: body.trim() };

      if (target === 'all') {
        await sendBroadcastNotification(notification);
      } else if (target === 'chapter') {
        await sendNotificationToChapter(targetId, notification);
      } else {
        await sendNotificationToUser(targetId, notification);
      }

      Alert.alert('Success', 'Notification sent.');
      setTitle('');
      setBody('');
      setTargetId('');
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const typeOptions = [
    { key: 'system', label: 'System' },
    { key: 'event', label: 'Event' },
    { key: 'referral', label: 'Referral' },
    { key: 'meeting', label: 'Meeting' },
  ];

  const targetOptions = [
    { key: 'all', label: 'All Users' },
    { key: 'chapter', label: 'Specific Chapter' },
    { key: 'user', label: 'Specific User' },
  ];

  const chapterOptions = chapters.map((c) => ({ key: c.id, label: c.name }));
  const userOptions = users.map((u) => ({ key: u.uid, label: `${u.name} (${u.businessName})` }));

  const historyColumns = [
    { key: 'title', label: 'Title', width: 200 },
    { key: 'body', label: 'Body', width: 280 },
    { key: 'type', label: 'Type', width: 100 },
    {
      key: 'createdAt',
      label: 'Sent',
      sortable: true,
      width: 140,
      render: (item: AppNotification) => (
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
  ];

  return (
    <AdminLayout title="Notification Center" activeScreen="AdminNotifications">
      {/* Compose Section */}
      <View style={styles.composeCard}>
          <View style={styles.composeHeader}>
            <Ionicons name="send" size={20} color={colors.primary} />
            <Text style={styles.composeTitle}>Send Notification</Text>
          </View>

          <AdminFormField label="Title *" value={title} onChangeText={setTitle} placeholder="Notification title" icon="text-outline" />
          <AdminFormField label="Body *" value={body} onChangeText={setBody} placeholder="Notification message" multiline numberOfLines={3} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AdminDropdownField label="Type" value={notifType} options={typeOptions} onSelect={(v) => setNotifType(v as any)} />
            </View>
            <View style={{ flex: 1 }}>
              <AdminDropdownField label="Target" value={target} options={targetOptions} onSelect={(v) => {
                setTarget(v as any);
                setTargetId('');
              }} />
            </View>
          </View>

          {target === 'chapter' && (
            <AdminDropdownField label="Select Chapter" value={targetId} options={chapterOptions} onSelect={setTargetId} placeholder="Choose chapter..." />
          )}
          {target === 'user' && (
            <AdminSearchableDropdown
              label="Select User"
              value={targetId}
              options={userOptions}
              onSelect={setTargetId}
              placeholder="Search and select user..."
            />
          )}

          <TouchableOpacity
            style={[styles.sendButton, sending && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Ionicons name="send-outline" size={18} color={colors.textInverse} />
            <Text style={styles.sendButtonText}>{sending ? 'Sending...' : 'Send Notification'}</Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <Text style={styles.historyTitle}>Recent Notifications</Text>
        <AdminDataTable
          columns={historyColumns}
          data={notifications}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyMessage="No notifications sent yet"
          pageSize={10}
        />
    </AdminLayout>
  );
};

export default AdminNotificationsScreen;

const styles = StyleSheet.create({
  composeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    maxWidth: 700,
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  composeTitle: {
    ...typography.h4,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sendButtonText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
  historyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: ADMIN_LAYOUT.elementGap,
  },
  dateText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
