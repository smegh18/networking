import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { AdminLayout } from '../components/layout/AdminLayout';
import { AdminStatusBadge } from '../components/ui/AdminStatusBadge';
import { AdminTabFilter } from '../components/ui/AdminTabFilter';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { 
  getUserAdmin, 
  getAllEventsAdmin, 
  getAllReferrals, 
  getAllMeetingsAdmin, 
  getAllAsks, 
  getAllVisitorInvitesAdmin, 
  getAllBusinessTransactions 
} from '../services/adminFirestore';
import { buildMemberPointsSummary } from '../../utils/memberPoints';
import type { AdminStackParamList } from '../types/admin';
import type { User, Event, Meeting, Referral, Ask, VisitorInvite, Business } from '../../types';

type Props = StackScreenProps<AdminStackParamList, 'AdminUserDetails'>;

const AdminUserDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId } = route.params;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [visitorInvites, setVisitorInvites] = useState<VisitorInvite[]>([]);
  const [business, setBusiness] = useState<Business[]>([]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [u, ev, me, re, as, vi, bu] = await Promise.all([
        getUserAdmin(userId),
        getAllEventsAdmin(),
        getAllMeetingsAdmin(),
        getAllReferrals(),
        getAllAsks(),
        getAllVisitorInvitesAdmin(),
        getAllBusinessTransactions(),
      ]);

      setUser(u);
      setEvents(ev);
      setMeetings(me);
      setReferrals(re);
      setAsks(as);
      setVisitorInvites(vi);
      setBusiness(bu);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pointsSummary = useMemo(() => {
    if (!user) return null;
    return buildMemberPointsSummary({
      user,
      events,
      meetings,
      referrals,
      asks,
      visitorInvites,
      business,
    });
  }, [user, events, meetings, referrals, asks, visitorInvites, business]);

  if (loading) {
    return (
      <AdminLayout title="User Details" activeScreen="AdminUsers" showBackButton onBack={() => navigation.goBack()}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout title="User Not Found" activeScreen="AdminUsers" showBackButton onBack={() => navigation.goBack()}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </AdminLayout>
    );
  }

  const tabs = [
    { key: 'activity', label: 'Member Activity' },
    { key: 'business', label: 'Business Info' },
  ];

  const Breadcrumb = () => (
    <View style={styles.breadcrumb}>
      <TouchableOpacity onPress={() => navigation.navigate('AdminUsers')}>
        <Text style={styles.breadcrumbLink}>User Management</Text>
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} style={styles.breadcrumbSeparator} />
      <Text style={styles.breadcrumbCurrent}>{user.name}</Text>
    </View>
  );

  return (
    <AdminLayout title={user.name} activeScreen="AdminUsers" showBackButton onBack={() => navigation.goBack()}>
      <Breadcrumb />

      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.userName}>{user.name}</Text>
          <View style={styles.roleBadgeContainer}>
            <AdminStatusBadge 
              label={user.role || 'member'} 
              color={user.role === 'admin' || user.role === 'superadmin' ? colors.primary : colors.textSecondary} 
            />
            {user.isActive === false && (
              <AdminStatusBadge label="Inactive" color={colors.error} />
            )}
          </View>
        </View>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('AdminUserForm', { userId: user.uid })}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <AdminTabFilter tabs={tabs} activeKey={activeTab} onSelect={setActiveTab} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'activity' ? (
          <View style={styles.activityContainer}>
            {/* Points Summary */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="stats-chart" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Points Summary</Text>
                <View style={styles.totalPointsBadge}>
                  <Text style={styles.totalPointsText}>{pointsSummary?.totalPoints || 0} pts</Text>
                </View>
              </View>
              <View style={styles.breakdownList}>
                {pointsSummary?.breakdown.map((item) => (
                  <View key={item.key} style={styles.breakdownItem}>
                    <View style={styles.breakdownInfo}>
                      <Text style={styles.breakdownLabel}>{item.label}</Text>
                      <Text style={styles.breakdownCount}>{item.count} items × {item.pointsPerItem}</Text>
                    </View>
                    <Text style={[styles.breakdownPoints, item.totalPoints < 0 && styles.negativePoints]}>
                      {item.totalPoints > 0 ? '+' : ''}{item.totalPoints}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.statLabel}>Referrals Given</Text>
                <Text style={styles.statValue}>{referrals.filter(r => r.giverId === userId).length}</Text>
              </View>
              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.statLabel}>Referrals Received</Text>
                <Text style={styles.statValue}>{referrals.filter(r => r.receiverId === userId).length}</Text>
              </View>
              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.statLabel}>Meetings</Text>
                <Text style={styles.statValue}>
                  {meetings.filter(m => m.requesterId === userId || m.requesteeId === userId).length}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.businessContainer}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <View style={styles.infoGrid}>
                <InfoItem label="Email" value={user.email} />
                <InfoItem label="Phone" value={user.phone} />
                <InfoItem label="Chapter" value={user.chapterId || 'N/A'} />
                <InfoItem label="Location" value={`${user.location?.city}, ${user.location?.state}`} />
              </View>
              
              <View style={styles.divider} />
              
              <Text style={styles.sectionTitle}>Business Details</Text>
              <View style={styles.infoGrid}>
                <InfoItem label="Business Name" value={user.businessName} />
                <InfoItem label="Category" value={user.businessCategory} />
                <InfoItem label="Description" value={user.businessDescription} fullWidth />
              </View>

              <Text style={styles.label}>Business Tags</Text>
              <View style={styles.tagGrid}>
                {user.businessTags?.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </AdminLayout>
  );
};

const InfoItem = ({ label, value, fullWidth }: { label: string, value: string, fullWidth?: boolean }) => (
  <View style={[styles.infoItem, fullWidth && styles.infoItemFull]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

export default AdminUserDetailsScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  breadcrumbLink: {
    ...typography.caption,
    color: colors.primary,
  },
  breadcrumbSeparator: {
    marginHorizontal: spacing.xs,
  },
  breadcrumbCurrent: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerMain: {
    flex: 1,
  },
  userName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  editButtonText: {
    ...typography.bodySmallMedium,
    color: '#fff',
    marginLeft: spacing.sm,
  },
  content: {
    marginTop: spacing.lg,
    flex: 1,
  },
  activityContainer: {
    gap: spacing.lg,
  },
  businessContainer: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  totalPointsBadge: {
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  totalPointsText: {
    ...typography.bodySmallSemiBold,
    color: colors.primary,
  },
  breakdownList: {
    gap: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownLabel: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  breakdownCount: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  breakdownPoints: {
    ...typography.bodySmallSemiBold,
    color: colors.success,
  },
  negativePoints: {
    color: colors.error,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  infoItem: {
    width: '45%',
    marginBottom: spacing.md,
  },
  infoItemFull: {
    width: '100%',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  infoValue: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xl,
  },
  label: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
