import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminDataTable } from '../components/ui/AdminDataTable';
import { AdminDropdownField, AdminFormField, AdminMultiSelectDropdownField } from '../components/ui/AdminFormField';
import { AdminModal } from '../components/ui/AdminModal';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { SearchBar } from '../../components/ui/SearchBar';
import { updateUserAdmin } from '../services/adminFirestore';
import { colors, spacing, typography } from '../../theme';
import {
  buildMemberPointsSummary,
  getLeadershipRoleDefaultPoints,
  LEADERSHIP_ROLE_OPTIONS,
} from '../../utils/memberPoints';
import type { AccessRole, Ask, Event, LeadershipRole, Meeting, Referral, User, VisitorInvite, Business, Chapter } from '../../types';
import type { AdminStackParamList } from '../types/admin';

type Props = StackScreenProps<AdminStackParamList, 'AdminRoles'>;

type RoleRow = {
  user: User;
  totalPoints: number;
  rolePoints: number;
  leadershipRoleLabel: string;
};

const ACCESS_ROLE_OPTIONS: Array<{ key: AccessRole; label: string }> = [
  { key: 'member', label: 'Member' },
  { key: 'admin', label: 'Admin' },
  { key: 'superadmin', label: 'Super Admin' },
];

const ACCESS_ROLE_COLORS: Record<AccessRole, string> = {
  member: colors.textSecondary,
  admin: colors.primary,
  superadmin: colors.accent,
};

function getAccessRoleLabel(role: AccessRole): string {
  return ACCESS_ROLE_OPTIONS.find((option) => option.key === role)?.label || 'Member';
}

const AdminRolesScreen: React.FC<Props> = () => {
  const { items: users, loading } = useRealtimeCollection<User>('users', 'uid');
  const { items: events } = useRealtimeCollection<Event>('events');
  const { items: meetings } = useRealtimeCollection<Meeting>('meetings');
  const { items: referrals } = useRealtimeCollection<Referral>('referrals');
  const { items: asks } = useRealtimeCollection<Ask>('asks');
  const { items: visitorInvites } = useRealtimeCollection<VisitorInvite>('visitorInvites');
  const { items: business } = useRealtimeCollection<Business>('business');
  const { items: chapters } = useRealtimeCollection<Chapter>('chapters');

  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [accessRole, setAccessRole] = useState<AccessRole>('member');
  const [leadershipRole, setLeadershipRole] = useState<LeadershipRole>('member');
  const [leadershipRolePoints, setLeadershipRolePoints] = useState('0');
  const [leadershipRoleCity, setLeadershipRoleCity] = useState('');
  const [leadershipRoleChapterIds, setLeadershipRoleChapterIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const roleRows = useMemo<RoleRow[]>(() => users.map((user) => {
    const summary = buildMemberPointsSummary({
      user,
      events,
      meetings,
      referrals,
      asks,
      visitorInvites,
      business,
    });
    return {
      user,
      totalPoints: summary.totalPoints,
      rolePoints: summary.rolePoints,
      leadershipRoleLabel: summary.roleLabel,
    };
  }), [asks, events, meetings, referrals, users, visitorInvites, business]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return roleRows;
    return roleRows.filter(({ user, leadershipRoleLabel }) =>
      user.name.toLowerCase().includes(query)
      || user.email.toLowerCase().includes(query)
      || leadershipRoleLabel.toLowerCase().includes(query)
      || (user.leadershipRoleCity || '').toLowerCase().includes(query),
    );
  }, [roleRows, search]);

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setAccessRole((user.role as AccessRole) || 'member');
    setLeadershipRole((user.leadershipRole as LeadershipRole) || 'member');
    setLeadershipRolePoints(String(
      typeof user.leadershipRolePoints === 'number'
        ? user.leadershipRolePoints
        : getLeadershipRoleDefaultPoints(user.leadershipRole),
    ));
    setLeadershipRoleCity(user.leadershipRoleCity || '');
    setLeadershipRoleChapterIds(user.leadershipRoleChapterIds || []);
  };

  const handleLeadershipRoleChange = (nextRole: LeadershipRole) => {
    setLeadershipRole(nextRole);
    setLeadershipRolePoints(String(getLeadershipRoleDefaultPoints(nextRole)));
    if (nextRole !== 'regional_chairman') {
      setLeadershipRoleCity('');
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;

    const parsedRolePoints = Number(leadershipRolePoints);
    if (!Number.isFinite(parsedRolePoints)) {
      Alert.alert('Error', 'Please enter a valid numeric value for role points.');
      return;
    }

    if (leadershipRole === 'regional_chairman' && !leadershipRoleCity.trim()) {
      Alert.alert('Error', 'Please enter the city for Regional Chairman.');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserAdmin(editingUser.uid, {
        role: accessRole,
        leadershipRole,
        leadershipRolePoints: parsedRolePoints,
        leadershipRoleCity: leadershipRole === 'regional_chairman' ? leadershipRoleCity.trim() : '',
        leadershipRoleChapterIds: leadershipRole !== 'member' ? leadershipRoleChapterIds : [],
      });
      setEditingUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update role.';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Member',
      sortable: true,
      width: 220,
      render: (item: RoleRow) => (
        <View>
          <Text style={styles.memberName}>{item.user.name}</Text>
          <Text style={styles.memberEmail}>{item.user.email}</Text>
        </View>
      ),
    },
    {
      key: 'accessRole',
      label: 'Access Role',
      width: 130,
      render: (item: RoleRow) => (
        <AdminStatusBadge
          label={getAccessRoleLabel((item.user.role as AccessRole) || 'member')}
          color={ACCESS_ROLE_COLORS[(item.user.role as AccessRole) || 'member']}
        />
      ),
    },
    {
      key: 'leadershipRoleLabel',
      label: 'Leadership Role',
      sortable: true,
      width: 190,
      render: (item: RoleRow) => <Text style={styles.cellText}>{item.leadershipRoleLabel}</Text>,
    },
    {
      key: 'leadershipRoleCity',
      label: 'City',
      width: 150,
      render: (item: RoleRow) => <Text style={styles.cellText}>{item.user.leadershipRoleCity || '—'}</Text>,
    },
    {
      key: 'rolePoints',
      label: 'Role Points',
      sortable: true,
      width: 110,
      render: (item: RoleRow) => <Text style={styles.pointsText}>{item.rolePoints}</Text>,
    },
    {
      key: 'totalPoints',
      label: 'Total Points',
      sortable: true,
      width: 120,
      render: (item: RoleRow) => <Text style={styles.pointsText}>{item.totalPoints}</Text>,
    },
  ];

  return (
    <AdminLayout title="Role Management" activeScreen="AdminRoles">
      <View style={styles.topBar}>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search members or roles..."
          />
        </View>
        <View style={styles.helperNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
          <Text style={styles.helperText}>Use role points to override titles that do not have a fixed score yet.</Text>
        </View>
      </View>

      <AdminDataTable
        columns={columns}
        data={filteredRows}
        keyExtractor={(item) => item.user.uid}
        loading={loading}
        emptyMessage="No members found"
        actions={(item) => (
          <TouchableOpacity onPress={() => openEditModal(item.user)} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      />

      <AdminModal
        visible={!!editingUser}
        title={editingUser ? `Update Role: ${editingUser.name}` : 'Update Role'}
        confirmLabel={isSaving ? 'Saving...' : 'Save'}
        onConfirm={handleSave}
        onCancel={() => !isSaving && setEditingUser(null)}
      >
        <View style={styles.modalBody}>
          <AdminDropdownField
            label="Access Role"
            value={accessRole}
            options={ACCESS_ROLE_OPTIONS}
            onSelect={(value) => setAccessRole(value as AccessRole)}
          />
          <AdminDropdownField
            label="Leadership Role"
            value={leadershipRole}
            options={LEADERSHIP_ROLE_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
            onSelect={(value) => handleLeadershipRoleChange(value as LeadershipRole)}
          />
          <AdminFormField
            label="Role Points"
            value={leadershipRolePoints}
            onChangeText={setLeadershipRolePoints}
            keyboardType="numeric"
          />
          {leadershipRole === 'regional_chairman' ? (
            <AdminFormField
              label="Regional City"
              value={leadershipRoleCity}
              onChangeText={setLeadershipRoleCity}
              placeholder="Enter city"
            />
          ) : null}
          {leadershipRole !== 'member' ? (
            <AdminMultiSelectDropdownField
              label="Assigned Chapters"
              values={leadershipRoleChapterIds}
              options={chapters.map((chapter) => ({ key: chapter.id, label: chapter.name }))}
              onChange={setLeadershipRoleChapterIds}
              placeholder="Select chapters"
              selectAllLabel="All Chapters"
            />
          ) : null}
        </View>
      </AdminModal>
    </AdminLayout>
  );
};

export default AdminRolesScreen;

const styles = StyleSheet.create({
  topBar: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  searchWrap: {
    width: '100%',
    maxWidth: 420,
  },
  helperNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  helperText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  memberName: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  memberEmail: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  cellText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  pointsText: {
    ...typography.bodySmallMedium,
    color: colors.primary,
  },
  modalBody: {
    gap: spacing.sm,
  },
});
