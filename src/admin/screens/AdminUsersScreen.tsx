import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { AdminLayout } from "../components/layout/AdminLayout";
import { AdminDataTable } from "../components/ui/AdminDataTable";
import { AdminTabFilter } from "../components/ui/AdminTabFilter";
import { AdminStatusBadge } from "../components/ui/AdminStatusBadge";
import { AdminModal } from "../components/ui/AdminModal";
import { AdminBreadcrumb } from "../components/ui/AdminBreadcrumb";
import { SearchBar } from "../../components/ui/SearchBar";
import { MemberProfileContent } from "../../components/profile/MemberProfileContent";
import { Button } from "../../components/ui/Button";
import { ADMIN_LAYOUT } from "../constants/layout";

import { colors, spacing, typography, borderRadius } from "../../theme";

import {
  getAllUsersAdmin,
  activateUser,
  deactivateUser,
  deleteUserDoc,
  getUserAdmin,
  getAllEventsAdmin,
  getAllReferrals,
  getAllMeetingsAdmin,
  getAllAsks,
  getAllVisitorInvitesAdmin,
  getAllBusinessTransactions,
  getAllChapters,
} from "../services/adminFirestore";

import type { AdminStackParamList } from "../types/admin";
import type { User, Event, Meeting, Referral, Ask, VisitorInvite, Business, Chapter } from "../../types";
import { normalizeTextLower } from "../../utils/helpers";
import { normalizeAdminUserProfile } from "../utils/normalizeAdminUser";

type Props = StackScreenProps<AdminStackParamList, "AdminUsers">;

const AdminUsersScreen: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteModal, setDeleteModal] = useState<User | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [visitorInvites, setVisitorInvites] = useState<VisitorInvite[]>([]);
  const [businessEntries, setBusinessEntries] = useState<Business[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsersAdmin();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string, listFallback?: User) => {
    const listUser = listFallback ?? users.find((u) => u.uid === userId);

    setDetailLoading(true);
    setSelectedUser(null);
    setSelectedUserId(userId);
    setProfileIncomplete(false);

    try {
      const [
        remoteUser,
        ev,
        me,
        re,
        as,
        vi,
        bu,
        ch,
      ] = await Promise.all([
        getUserAdmin(userId).catch(() => null),
        getAllEventsAdmin().catch(() => [] as Event[]),
        getAllMeetingsAdmin().catch(() => [] as Meeting[]),
        getAllReferrals().catch(() => [] as Referral[]),
        getAllAsks().catch(() => [] as Ask[]),
        getAllVisitorInvitesAdmin().catch(() => [] as VisitorInvite[]),
        getAllBusinessTransactions().catch(() => [] as Business[]),
        getAllChapters().catch(() => [] as Chapter[]),
      ]);

      const hasRemoteRecord = Boolean(remoteUser);
      const merged = normalizeAdminUserProfile(
        userId,
        remoteUser ?? listUser ?? { uid: userId },
      );

      setSelectedUser(merged);
      setProfileIncomplete(!hasRemoteRecord);
      setEvents(Array.isArray(ev) ? ev : []);
      setMeetings(Array.isArray(me) ? me : []);
      setReferrals(Array.isArray(re) ? re : []);
      setAsks(Array.isArray(as) ? as : []);
      setVisitorInvites(Array.isArray(vi) ? vi : []);
      setBusinessEntries(Array.isArray(bu) ? bu : []);
      setChapters(Array.isArray(ch) ? ch : []);
    } catch (err) {
      console.error(err);
      setSelectedUser(
        normalizeAdminUserProfile(userId, listUser ?? { uid: userId }),
      );
      setProfileIncomplete(true);
      setEvents([]);
      setMeetings([]);
      setReferrals([]);
      setAsks([]);
      setVisitorInvites([]);
      setBusinessEntries([]);
      setChapters([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const chapterName = useMemo(
    () =>
      selectedUser?.chapterId
        ? chapters.find((c) => c.id === selectedUser.chapterId)?.name
        : undefined,
    [selectedUser?.chapterId, chapters],
  );

  const filteredUsers = useMemo(() => {
    let result = users;

    if (activeTab === "active") result = result.filter((u) => u.isActive !== false);
    if (activeTab === "inactive") result = result.filter((u) => u.isActive === false);

    if (search.trim()) {
      const q = normalizeTextLower(search);
      result = result.filter(
        (u) =>
          normalizeTextLower(u.name).includes(q) ||
          normalizeTextLower(u.email).includes(q),
      );
    }

    return result;
  }, [users, activeTab, search]);

  const tabs = useMemo(
    () => [
      { key: "all", label: "All", count: users.length },
      {
        key: "active",
        label: "Active",
        count: users.filter((u) => u.isActive !== false).length,
      },
      {
        key: "inactive",
        label: "Inactive",
        count: users.filter((u) => u.isActive === false).length,
      },
    ],
    [users],
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        width: 280,
        render: (item: User) => (
          <View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
        ),
      },
      { key: "businessName", label: "Business", width: 280 },
      { key: "businessCategory", label: "Category", width: 200 },
      {
        key: "isActive",
        label: "Status",
        width: 140,
        render: (item: User) => (
          <AdminStatusBadge
            label={item.isActive === false ? "Inactive" : "Active"}
            color={item.isActive === false ? colors.error : colors.success}
          />
        ),
      },
      {
        key: "actions",
        label: "Actions",
        width: 200,
        render: (item: User) => (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => loadUserDetails(item.uid, item)}>
              <Ionicons name="eye-outline" size={18} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("AdminUserForm", { userId: item.uid })}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                if (item.isActive === false) {
                  await activateUser(item.uid);
                } else {
                  await deactivateUser(item.uid);
                }
                loadUsers();
              }}
            >
              <Ionicons
                name={item.isActive === false ? "checkmark-circle-outline" : "ban-outline"}
                size={18}
                color={item.isActive === false ? colors.success : colors.warning}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDeleteModal(item)}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ),
      },
    ],
    [navigation],
  );

  const handleDelete = async () => {
    if (!deleteModal) return;
    await deleteUserDoc(deleteModal.uid);
    setDeleteModal(null);
    if (selectedUserId === deleteModal.uid) {
      setSelectedUserId(null);
      setSelectedUser(null);
    }
    loadUsers();
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;
    if (selectedUser.isActive === false) {
      await activateUser(selectedUser.uid);
    } else {
      await deactivateUser(selectedUser.uid);
    }
    const updated = await getUserAdmin(selectedUser.uid);
    setSelectedUser(
      normalizeAdminUserProfile(selectedUser.uid, updated ?? selectedUser),
    );
    setProfileIncomplete(!updated);
    loadUsers();
  };

  const renderAdminToolbar = () => {
    if (!selectedUser) return null;
    const isActive = selectedUser.isActive !== false;
    return (
      <View style={styles.adminToolbar}>
        <View style={styles.adminToolbarLeft}>
          <AdminStatusBadge
            label={isActive ? "Active" : "Inactive"}
            color={isActive ? colors.success : colors.error}
          />
          <Text style={styles.adminEmail}>{selectedUser.email}</Text>
        </View>
        <View style={styles.adminToolbarActions}>
          <TouchableOpacity
            style={[styles.adminIconButton, !isActive && styles.adminIconButtonSuccess]}
            onPress={handleToggleActive}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? "ban-outline" : "checkmark-circle-outline"}
              size={20}
              color={isActive ? colors.warning : colors.success}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adminIconButton}
            onPress={() => navigation.navigate("AdminUserForm", { userId: selectedUser.uid })}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adminIconButton, styles.adminIconButtonDanger]}
            onPress={() => setDeleteModal(selectedUser)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const goBackToList = () => {
    setSelectedUserId(null);
    setSelectedUser(null);
    setProfileIncomplete(false);
  };

  const renderDetailBreadcrumb = (currentLabel: string) => (
    <AdminBreadcrumb
      items={[
        { label: "User Management", onPress: goBackToList },
        { label: currentLabel },
      ]}
    />
  );

  const renderDetailView = () => {
    if (detailLoading) {
      return (
        <>
          {renderDetailBreadcrumb("Loading…")}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading profile…</Text>
          </View>
        </>
      );
    }

    if (!selectedUser) {
      return (
        <>
          {renderDetailBreadcrumb("Loading failed")}
          <View style={styles.errorContainer}>
            <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.errorText}>Could not open this profile</Text>
            <TouchableOpacity onPress={goBackToList} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to List</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return (
      <>
        {renderDetailBreadcrumb(selectedUser.name)}
        {profileIncomplete ? (
          <View style={styles.incompleteBanner}>
            <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.incompleteBannerText}>
              This user record is missing or incomplete in the database. Showing available data with empty
              sections.
            </Text>
          </View>
        ) : null}
        <MemberProfileContent
        user={selectedUser}
        chapterName={chapterName}
        events={events}
        meetings={meetings}
        referrals={referrals}
        asks={asks}
        visitorInvites={visitorInvites}
        businessEntries={businessEntries}
        layout="scroll"
        headerSlot={renderAdminToolbar()}
        businessTabFooter={
          <View style={styles.adminFooter}>
            <Button
              title="Edit Profile"
              onPress={() =>
                navigation.navigate("AdminUserForm", { userId: selectedUser.uid })
              }
              icon="create-outline"
              fullWidth
            />
          </View>
        }
        />
      </>
    );
  };

  return (
    <AdminLayout
      title={selectedUserId ? selectedUser?.name ?? "User Details" : "User Management"}
      activeScreen="AdminUsers"
      showBackButton={!!selectedUserId}
      onBack={goBackToList}
    >
      {!selectedUserId ? (
        <>
          <View style={[styles.topBar, isCompact && styles.topBarCompact]}>
            <View style={styles.searchWrap}>
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search users..."
              />
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate("AdminUserForm", {})}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addText}>Add User</Text>
            </TouchableOpacity>
          </View>

          <AdminTabFilter tabs={tabs} activeKey={activeTab} onSelect={setActiveTab} />

          <AdminDataTable
            columns={columns}
            data={filteredUsers}
            keyExtractor={(item) => item.uid}
            loading={loading}
            paginate={false}
            fullWidth
            onRowPress={(item) => loadUserDetails(item.uid, item)}
          />
        </>
      ) : (
        renderDetailView()
      )}

      <AdminModal
        visible={!!deleteModal}
        title="Delete User"
        message={`Delete ${deleteModal?.name}?`}
        confirmLabel="Delete"
        confirmColor={colors.error}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal(null)}
      />
    </AdminLayout>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ADMIN_LAYOUT.sectionGap,
    gap: ADMIN_LAYOUT.elementGap,
    flexWrap: "wrap",
  },
  topBarCompact: {
    alignItems: "stretch",
  },
  searchWrap: {
    flex: 1,
    minWidth: 240,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  addText: {
    color: "#fff",
    marginLeft: 6,
  },
  name: {
    ...typography.bodySmallMedium,
  },
  email: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["3xl"],
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["3xl"],
    gap: spacing.md,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  backButtonText: {
    ...typography.bodySmallMedium,
    color: "#fff",
  },
  adminToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  adminToolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
    minWidth: 200,
  },
  adminEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  adminToolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  adminIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceVariant,
  },
  adminIconButtonSuccess: {
    backgroundColor: colors.successLight,
  },
  adminIconButtonDanger: {
    backgroundColor: colors.errorLight,
  },
  adminFooter: {
    marginBottom: spacing["4xl"],
  },
  incompleteBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  incompleteBannerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});

export default AdminUsersScreen;
