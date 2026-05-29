import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { ADMIN_LAYOUT } from '../../constants/layout';

interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface AdminTabFilterProps {
  tabs: TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export const AdminTabFilter: React.FC<AdminTabFilterProps> = ({ tabs, activeKey, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count !== undefined && (
              <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                <Text style={[styles.countText, isActive && styles.countTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: ADMIN_LAYOUT.elementGap,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  tabText: {
    ...typography.bodySmallMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textInverse,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  countTextActive: {
    color: colors.textInverse,
  },
});
