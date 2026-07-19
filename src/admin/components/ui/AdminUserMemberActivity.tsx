import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { Card } from "../../../components/ui/Card";
import { Section } from "../../../components/layout/Section";
import { colors, typography, spacing } from "../../../theme";
import type { User, Event, Meeting, Referral, Ask, VisitorInvite, Business } from "../../../types";
import { POINT_VALUES } from "../../../utils/memberPoints";
import {
  deleteReferral,
  deleteMeeting,
  removeEventAttendance,
} from "../../services/adminFirestore";

type Props = {
  user: User;
  events: Event[];
  meetings: Meeting[];
  referrals: Referral[];
  asks: Ask[];
  visitorInvites: VisitorInvite[];
  businessEntries: Business[];
};

type MemberActivityItem = {
  id: string;
  kind: "attendance" | "meeting" | "referral_given" | "referral_received" | "substitute";
  occurredAt: string;
  title: string;
  summary: string;
  meta?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  points: number;
  onDelete?: () => Promise<void>;
};

export const AdminUserMemberActivity: React.FC<Props> = ({
  user,
  events,
  meetings,
  referrals,
}) => {
  const { t } = useTranslation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activityItems = useMemo<MemberActivityItem[]>(() => {
    const attendanceActivities: MemberActivityItem[] = [];
    events.forEach((event) => {
      const record = event.attendanceRecords?.[user.uid];
      const detail = event.attendanceDetails?.[user.uid];

      if (record) {
        let title = "";
        let summary = "";
        let icon: keyof typeof Ionicons.glyphMap = "checkmark-circle-outline";
        let accentColor: string = colors.success;
        let points = 0;

        if (record.status === "present") {
          title = `Present at ${event.title}`;
          summary = `${(event.type || "event").charAt(0).toUpperCase()}${(event.type || "event").slice(1)} at ${event.location || "the venue"}`;
          points = POINT_VALUES.eventPresent;
        } else if (record.status === "late") {
          title = `Late at ${event.title}`;
          summary = `Late arrival recorded for ${event.location || "the event venue"}`;
          icon = "time-outline";
          accentColor = colors.warning;
          points = POINT_VALUES.eventLate;
        } else if (record.status === "absent") {
          title = `Absent for ${event.title}`;
          summary = `Absence recorded for ${event.type || "event"} at ${event.location || "the venue"}`;
          icon = "close-circle-outline";
          accentColor = colors.error;
          points = POINT_VALUES.eventAbsent;
        }

        attendanceActivities.push({
          id: `attendance_${event.id}_${record.status}`,
          kind: "attendance",
          occurredAt: record.recordedAt,
          title,
          summary,
          meta: formatActivityTime(record.recordedAt),
          icon,
          accentColor,
          points,
          onDelete: async () => {
            await removeEventAttendance(event.id, user.uid);
          },
        });
        return;
      }

      if (detail?.status === "substituted") {
        attendanceActivities.push({
          id: `attendance_${event.id}_substituted`,
          kind: "substitute",
          occurredAt: detail.updatedAt,
          title: `Substitute arranged for ${event.title}`,
          summary: `${detail.substituteName || "Substitute"} will attend in your place`,
          meta: formatActivityTime(detail.updatedAt),
          icon: "swap-horizontal-outline",
          accentColor: colors.info,
          points: POINT_VALUES.eventSubstitute,
          onDelete: async () => {
            await removeEventAttendance(event.id, user.uid);
          },
        });
      }
    });

    const oneToOneActivities = meetings
      .filter(
        (meeting) =>
          meeting.type === "one_on_one" &&
          meeting.status !== "rejected" &&
          (meeting.requesterId === user.uid || meeting.requesteeId === user.uid),
      )
      .map((meeting) => {
        const otherPerson =
          meeting.requesterId === user.uid ? meeting.requesteeName : meeting.requesterName;
        const scheduledAt = normalizeMeetingTimestamp(meeting);
        const isCompleted = meeting.status === "completed";
        
        return {
          id: `meeting_${meeting.id}`,
          kind: "meeting" as const,
          occurredAt: scheduledAt,
          title: `1-to-1 meeting with ${otherPerson}`,
          summary: `Status: ${formatLabel(meeting.status)} • ${meeting.scheduledTime || "Scheduled meeting"}`,
          meta: formatActivityTime(scheduledAt),
          icon: "people-outline" as const,
          accentColor: colors.info,
          points: isCompleted ? POINT_VALUES.oneOnOneMeeting : 0,
          onDelete: async () => {
            await deleteMeeting(meeting.id);
          },
        };
      });

    const referralActivities = referrals
      .filter((referral) => referral.giverId === user.uid || referral.receiverId === user.uid)
      .map((referral) => {
        const isGiven = referral.giverId === user.uid;
        const directionLabel = isGiven ? "given" : "received";
        const otherPerson = isGiven ? referral.receiverName : referral.giverName;
        const amountText = formatCurrency(referral.amount || 0);

        let points = 0;
        if (isGiven) {
          const isOutside = !String(referral.receiverId || "").trim();
          if (isOutside) {
            points += POINT_VALUES.outsideReferralGiven;
          }
          if (referral.status === "completed") {
            points += POINT_VALUES.referralConvertedToBusiness;
          }
        }

        return {
          id: `referral_${referral.id}_${directionLabel}`,
          kind: isGiven ? ("referral_given" as const) : ("referral_received" as const),
          occurredAt: referral.createdAt,
          title: `${isGiven ? "Reference given" : "Reference received"}${amountText ? ` • ${amountText}` : ""}`,
          summary: `${isGiven ? "Business given to" : "Business received from"} ${otherPerson}`,
          meta: `${formatActivityTime(referral.createdAt)}${referral.contactName ? ` • Contact: ${referral.contactName}` : ""}`,
          icon: isGiven ? ("arrow-up-circle-outline" as const) : ("arrow-down-circle-outline" as const),
          accentColor: isGiven ? colors.secondary : colors.accent,
          points,
          onDelete: async () => {
            await deleteReferral(referral.id);
          },
        };
      });

    return [...attendanceActivities, ...oneToOneActivities, ...referralActivities].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }, [events, meetings, referrals, user.uid]);

  const handleDelete = (item: MemberActivityItem) => {
    if (!item.onDelete) return;

    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete this activity?\n\n"${item.title}"`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(item.id);
              await item.onDelete!();
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Failed to delete activity.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Section title={t("profile.memberActivity", "Member Activity")}>
      {activityItems.length === 0 ? (
        <Card>
          <Text style={styles.activityEmpty}>
            No member activity found for this user.
          </Text>
        </Card>
      ) : (
        <View style={styles.activityList}>
          {activityItems.map((activity) => (
            <Card key={activity.id} style={styles.activityCard}>
              <View style={styles.cardContent}>
                {/* Left Side: Existing Info */}
                <View style={styles.leftSide}>
                  <View style={styles.activityHeader}>
                    <View
                      style={[
                        styles.activityIconWrap,
                        { backgroundColor: `${activity.accentColor}18` },
                      ]}
                    >
                      <Ionicons name={activity.icon} size={18} color={activity.accentColor} />
                    </View>
                    <View style={styles.activityTextWrap}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityMeta}>{activity.meta || "-"}</Text>
                    </View>
                  </View>
                  <Text style={styles.activitySummary}>{activity.summary}</Text>
                </View>

                {/* Divider */}
                <View style={styles.verticalDivider} />

                {/* Right Side: Points & Delete */}
                <View style={styles.rightSide}>
                  <View style={styles.pointsContainer}>
                    <Text style={styles.pointsLabel}>Points</Text>
                    <Text
                      style={[
                        styles.pointsValue,
                        { color: activity.points > 0 ? colors.success : activity.points < 0 ? colors.error : colors.textSecondary },
                      ]}
                    >
                      {activity.points > 0 ? "+" : ""}
                      {activity.points}
                    </Text>
                  </View>
                  
                  {activity.onDelete && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(activity)}
                      disabled={deletingId === activity.id}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={deletingId === activity.id ? colors.textTertiary : colors.error}
                      />
                      <Text
                        style={[
                          styles.deleteButtonText,
                          deletingId === activity.id && { color: colors.textTertiary },
                        ]}
                      >
                        {deletingId === activity.id ? "Deleting..." : "Delete"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Section>
  );
};

function normalizeMeetingTimestamp(meeting: Meeting): string {
  if (meeting.createdAt) return meeting.createdAt;
  if (meeting.scheduledDate) {
    return meeting.scheduledDate.includes("T")
      ? meeting.scheduledDate
      : `${meeting.scheduledDate}T00:00:00`;
  }
  return new Date(0).toISOString();
}

function formatActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  if (!amount) return "";
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const styles = StyleSheet.create({
  activityEmpty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  activityList: {
    gap: spacing.lg,
  },
  activityCard: {
    marginBottom: spacing.lg,
    padding: 0, // override default padding to apply it inside cardContent for flex row
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    padding: spacing.lg,
  },
  leftSide: {
    flex: 1,
    paddingRight: spacing.md,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.sm,
  },
  rightSide: {
    width: 100,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingLeft: spacing.md,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  activityMeta: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  activitySummary: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  pointsContainer: {
    alignItems: "flex-end",
    marginBottom: spacing.md,
  },
  pointsLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  pointsValue: {
    ...typography.h4,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: 4,
  },
  deleteButtonText: {
    ...typography.captionMedium,
    color: colors.error,
  },
});
