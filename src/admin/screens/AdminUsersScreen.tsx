import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { AdminLayout } from "../components/layout/AdminLayout";
import { AdminDataTable } from "../components/ui/AdminDataTable";
import { AdminTabFilter } from "../components/ui/AdminTabFilter";
import { AdminStatusBadge } from "../components/ui/AdminStatusBadge";
import { AdminModal } from "../components/ui/AdminModal";
import { SearchBar } from "../../components/ui/SearchBar";
import { ADMIN_LAYOUT } from "../constants/layout";

import { colors, spacing, typography, borderRadius } from "../../theme";

import {
  getAllUsersAdmin,
  activateUser,
  deactivateUser,
  deleteUserDoc,
} from "../services/adminFirestore";

import type { AdminStackParamList } from "../types/admin";
import type { User } from "../../types";

type Props = StackScreenProps<AdminStackParamList, "AdminUsers">;

const AdminUsersScreen: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteModal, setDeleteModal] = useState<User | null>(null);

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

  const filteredUsers = useMemo(() => {
    let result = users;

    if (activeTab === "active")
      result = result.filter((u) => u.isActive !== false);

    if (activeTab === "inactive")
      result = result.filter((u) => u.isActive === false);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
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
    [users]
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        width: 220,
        render: (item: User) => (
          <View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
        ),
      },

      { key: "businessName", label: "Business", width: 200 },

      { key: "businessCategory", label: "Category", width: 160 },

      {
        key: "isActive",
        label: "Status",
        width: 120,
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
        width: 140,
        render: (item: User) => (
          <View style={styles.actions}>
            {/* Edit */}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("AdminUserForm", { userId: item.uid })
              }
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* Activate / Deactivate */}
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
                name={
                  item.isActive === false
                    ? "checkmark-circle-outline"
                    : "ban-outline"
                }
                size={18}
                color={
                  item.isActive === false
                    ? colors.success
                    : colors.warning
                }
              />
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity onPress={() => setDeleteModal(item)}>
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.error}
              />
            </TouchableOpacity>
          </View>
        ),
      },
    ],
    [users]
  );

  const handleDelete = async () => {
    if (!deleteModal) return;

    await deleteUserDoc(deleteModal.uid);
    setDeleteModal(null);
    loadUsers();
  };

  return (
    <AdminLayout title="User Management" activeScreen="AdminUsers">
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

      <AdminTabFilter
        tabs={tabs}
        activeKey={activeTab}
        onSelect={setActiveTab}
      />

      <AdminDataTable
        columns={columns}
        data={filteredUsers}
        keyExtractor={(item) => item.uid}
        loading={loading}
      />

      {/* Delete Modal */}
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

export default AdminUsersScreen;

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
});
