import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AdminKPICard } from "./AdminKPICard";
import { AdminDataTable } from "./AdminDataTable";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { SearchBar } from "../../../components/ui/SearchBar";
import { colors, spacing, typography, borderRadius } from "../../../theme";
import type { Business, User, Chapter } from "../../../types";
import { normalizeTextLower } from "../../../utils/helpers";

type Props = {
  user: User;
  businessEntries: Business[];
  chapters: Chapter[];
};

export const AdminUserBusinessActivity: React.FC<Props> = ({
  user,
  businessEntries,
  chapters,
}) => {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredEntries = useMemo(() => {
    let result = businessEntries;

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(
        (b) => b.date && new Date(b.date).getTime() >= start
      );
    }
    if (endDate) {
      // Add 24 hours to include the whole end date
      const end = new Date(endDate).getTime() + 86400000;
      result = result.filter(
        (b) => b.date && new Date(b.date).getTime() <= end
      );
    }

    // Filter by search (name or chapter)
    if (search.trim()) {
      const q = normalizeTextLower(search);
      result = result.filter((b) => {
        const otherName =
          b.givenById === user.uid ? b.givenToName : b.givenByName;
        const chapterNameMatch = b.chapterName
          ? normalizeTextLower(b.chapterName).includes(q)
          : false;

        return normalizeTextLower(otherName).includes(q) || chapterNameMatch;
      });
    }

    // Sort descending by date
    return result.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [businessEntries, search, startDate, endDate, user.uid]);

  const kpis = useMemo(() => {
    let given = 0;
    let received = 0;
    let chapterGiven = 0;
    let chapterReceived = 0;

    filteredEntries.forEach((b) => {
      // Only count approved business for KPIs
      if (b.status && b.status !== "approved") return;
      const amt = b.amount || 0;

      if (b.givenById === user.uid) {
        given += amt;
        // As a fallback, assuming if it happens within chapter context, chapterId matches
        if (b.chapterId === user.chapterId) {
          chapterGiven += amt;
        }
      } else if (b.givenToId === user.uid) {
        received += amt;
        if (b.chapterId === user.chapterId) {
          chapterReceived += amt;
        }
      }
    });

    return { given, received, chapterGiven, chapterReceived };
  }, [filteredEntries, user.uid, user.chapterId]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns = useMemo(
    () => [
      {
        key: "date",
        label: "Date",
        width: 120,
        render: (item: Business) => (
          <Text style={styles.cellText}>
            {item.date
              ? new Date(item.date).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </Text>
        ),
      },
      {
        key: "type",
        label: "Direction",
        width: 120,
        render: (item: Business) => {
          const isGiven = item.givenById === user.uid;
          return (
            <View style={styles.directionWrap}>
              <Ionicons
                name={
                  isGiven ? "arrow-up-circle-outline" : "arrow-down-circle-outline"
                }
                size={16}
                color={isGiven ? colors.success : colors.accent}
              />
              <Text
                style={[
                  styles.directionText,
                  { color: isGiven ? colors.success : colors.accent },
                ]}
              >
                {isGiven ? "Given" : "Received"}
              </Text>
            </View>
          );
        },
      },
      {
        key: "party",
        label: "Party",
        width: 180,
        render: (item: Business) => {
          const otherName =
            item.givenById === user.uid ? item.givenToName : item.givenByName;
          return (
            <View>
              <Text style={styles.nameText} numberOfLines={1}>
                {otherName}
              </Text>
              <Text style={styles.chapterText} numberOfLines={1}>
                {item.chapterName || "—"}
              </Text>
            </View>
          );
        },
      },
      {
        key: "amount",
        label: "Amount",
        width: 140,
        render: (item: Business) => (
          <Text style={styles.amountText}>{formatAmount(item.amount)}</Text>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: 120,
        render: (item: Business) => (
          <AdminStatusBadge
            label={item.status || "pending"}
            color={
              item.status === "approved"
                ? colors.success
                : item.status === "rejected"
                ? colors.error
                : colors.warning
            }
          />
        ),
      },
    ],
    [user.uid]
  );

  return (
    <View style={styles.container}>
      <View style={styles.kpiRow}>
        <AdminKPICard
          title="Total Given"
          value={formatAmount(kpis.given)}
          icon="arrow-up-circle"
          iconColor={colors.success}
          iconBg={colors.successLight}
        />
        <AdminKPICard
          title="Total Received"
          value={formatAmount(kpis.received)}
          icon="arrow-down-circle"
          iconColor={colors.accent}
          iconBg={colors.accentFaded}
        />
        <AdminKPICard
          title="Chapter Given"
          value={formatAmount(kpis.chapterGiven)}
          icon="people"
          iconColor={colors.primary}
          iconBg={colors.primaryFaded}
        />
        <AdminKPICard
          title="Chapter Received"
          value={formatAmount(kpis.chapterReceived)}
          icon="people"
          iconColor={colors.secondary}
          iconBg={colors.secondaryFaded}
        />
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or chapter..."
          />
        </View>

        {Platform.OS === "web" ? (
          <View style={styles.dateFilters}>
            <View style={styles.dateInputWrapper}>
              <Text style={styles.dateLabel}>Start:</Text>
              <input
                type="date"
                style={styles.nativeDateInput as any}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </View>
            <View style={styles.dateInputWrapper}>
              <Text style={styles.dateLabel}>End:</Text>
              <input
                type="date"
                style={styles.nativeDateInput as any}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </View>
            {(startDate || endDate) && (
              <Text
                style={styles.clearDateText}
                onPress={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear
              </Text>
            )}
          </View>
        ) : null}
      </View>

      <AdminDataTable
        columns={columns}
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        paginate={true}
        fullWidth
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: spacing.md,
  },
  kpiRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
    flexWrap: "wrap",
  },
  filtersRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchWrap: {
    flex: 1,
    minWidth: 240,
  },
  dateFilters: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dateInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateLabel: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  nativeDateInput: {
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  clearDateText: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  cellText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  nameText: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  chapterText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  amountText: {
    ...typography.bodySmallMedium,
    color: colors.text,
  },
  directionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  directionText: {
    ...typography.captionMedium,
  },
});
