import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";

import { AdminLayout } from "../components/layout/AdminLayout";
import {
  AdminFormField,
  AdminDropdownField,
} from "../components/ui/AdminFormField";
import { ADMIN_LAYOUT } from "../constants/layout";

import { colors, typography, spacing, borderRadius } from "../../theme";
import { useBusinessConfig, useRealtimeCollection } from "../../hooks/useRealtimeData";
import { DEFAULT_CHAPTER_ID, DEFAULT_CHAPTER_NAME, getUserChapterId } from "../../utils/chapter";

import {
  getUserAdmin,
  createUserAdmin,
  updateUserAdmin,
} from "../services/adminFirestore";

import type { AccessRole, Chapter } from "../../types";
import type { AdminStackParamList } from "../types/admin";

type Props = StackScreenProps<AdminStackParamList, "AdminUserForm">;

const AdminUserFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const userId = route.params?.userId;
  const isEdit = !!userId;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [chapterId, setChapterId] = useState(getUserChapterId(""));

  const [role, setRole] = useState<AccessRole>("member");
  const [saving, setSaving] = useState(false);

  const { config: businessConfig } = useBusinessConfig();
  const { items: chapters } = useRealtimeCollection<Chapter>("chapters");

  useEffect(() => {
    if (isEdit && userId) loadUser(userId);
  }, [userId]);

  const loadUser = async (uid: string) => {
    try {
      const user = await getUserAdmin(uid);
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setPhone(user.phone);
        setBusinessName(user.businessName);
        setBusinessDescription(user.businessDescription);
        setBusinessCategory(user.businessCategory);
        setSelectedTags(user.businessTags || []);
        setCity(user.location?.city || "");
        setState(user.location?.state || "");
        setChapterId(getUserChapterId(user.chapterId));
        setRole((user.role as AccessRole) || "member");
      }
    } catch {
      Alert.alert("Error", "Failed to load user data.");
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const categoryOptions = useMemo(
    () =>
      businessConfig.businessCategories.map((c) => ({
        key: c,
        label: c,
      })),
    [businessConfig.businessCategories]
  );

  const roleOptions = useMemo(
    () => [
      { key: "member", label: "Member" },
      { key: "admin", label: "Admin" },
      { key: "superadmin", label: "Super Admin" },
    ],
    []
  );

  const chapterOptions = useMemo(
    () => (
      chapters.length > 0
        ? chapters.map((chapter) => ({ key: chapter.id, label: chapter.name }))
        : [{ key: DEFAULT_CHAPTER_ID, label: DEFAULT_CHAPTER_NAME }]
    ),
    [chapters],
  );

  const availableTags = useMemo(
    () =>
      businessConfig.tagsByCategory?.[businessCategory] ??
      businessConfig.popularTags ??
      [],
    [businessConfig, businessCategory]
  );

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Error", "Name and Email are required.");
      return;
    }

    try {
      setSaving(true);

      if (isEdit && userId) {
        await updateUserAdmin(userId, {
          name,
          email,
          phone,
          businessName,
          businessDescription,
          businessCategory,
          businessTags: selectedTags,
          location: { city, state },
          chapterId: getUserChapterId(chapterId),
          role,
        });
      } else {
        const uid = `u_${Date.now()}`;

        await createUserAdmin({
          uid,
          name,
          email,
          phone,
          photoURL: "",
          businessName,
          businessDescription,
          businessCategory,
          businessTags: selectedTags,
          businessPhotos: [],
          socialLinks: {
            instagram: "",
            facebook: "",
            whatsapp: phone,
            linkedin: "",
          },
          chapterId: getUserChapterId(chapterId),
          location: { city, state },
          dateOfBirth: "",
          language: "en",
          biometricEnabled: false,
          role,
          leadershipRole: 'member',
          leadershipRolePoints: 0,
          leadershipRoleCity: '',
          isActive: true,
        });
      }

      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={isEdit ? "Edit User" : "Create User"}
      activeScreen="AdminUsers"
      showBackButton
      onBack={() => navigation.goBack()}
    >
      <View style={styles.formCard}>
        <View style={[styles.row, isCompact && styles.rowCompact]}>
          <View style={styles.fieldColumn}>
            <AdminFormField label="Full Name *" value={name} onChangeText={setName} />
          </View>
          <View style={styles.fieldColumn}>
            <AdminFormField
              label="Email *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>
        </View>

        <View style={[styles.row, isCompact && styles.rowCompact]}>
          <View style={styles.fieldColumn}>
            <AdminFormField label="Phone" value={phone} onChangeText={setPhone} />
          </View>
          <View style={styles.fieldColumn}>
            <AdminFormField
              label="Business Name"
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>
        </View>

        <View style={[styles.row, isCompact && styles.rowCompact]}>
          <View style={styles.fieldColumn}>
            <AdminDropdownField
              label="Business Category"
              value={businessCategory}
              options={categoryOptions}
              onSelect={setBusinessCategory}
            />
          </View>

          <View style={styles.fieldColumn}>
            <AdminDropdownField
              label="Access Role"
              value={role}
              options={roleOptions}
              onSelect={(key) => setRole(key as AccessRole)}
            />
          </View>
        </View>

        <View style={[styles.row, isCompact && styles.rowCompact]}>
          <View style={styles.fieldColumn}>
            <AdminDropdownField
              label="Chapter"
              value={chapterId}
              options={chapterOptions}
              onSelect={setChapterId}
              placeholder="Select chapter..."
              searchable
              searchPlaceholder="Search chapters..."
            />
          </View>
          <View style={styles.fieldColumn} />
        </View>

        <View style={[styles.row, isCompact && styles.rowCompact]}>
          <View style={styles.fieldColumn}>
            <AdminFormField label="City" value={city} onChangeText={setCity} />
          </View>
          <View style={styles.fieldColumn}>
            <AdminFormField label="State" value={state} onChangeText={setState} />
          </View>
        </View>

        <Text style={styles.label}>Business Tags</Text>

        <View style={styles.tagGrid}>
          {availableTags.map((tag) => {
            const selected = selectedTags.includes(tag);

            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selected && styles.tagSelected]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    selected && styles.tagTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : isEdit ? "Update User" : "Create User"}
          </Text>
        </TouchableOpacity>
      </View>
    </AdminLayout>
  );
};

export default AdminUserFormScreen;

const styles = StyleSheet.create({
  formCard: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
  },

  row: {
    flexDirection: "row",
    gap: ADMIN_LAYOUT.elementGap,
    marginBottom: spacing.sm,
  },

  rowCompact: {
    flexDirection: "column",
    gap: 0,
  },

  fieldColumn: {
    flex: 1,
    minWidth: 0,
  },

  label: {
    ...typography.bodySmallMedium,
    marginBottom: 8,
  },

  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },

  tagSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },

  tagText: {
    ...typography.caption,
  },

  tagTextSelected: {
    color: colors.primary,
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },

  saveText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
});
