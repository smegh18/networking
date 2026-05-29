import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: number;
  render?: (item: T) => React.ReactNode;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  enablePagination?: boolean;
  maxBodyHeight?: number;
  actions?: (item: T) => React.ReactNode;
  /** When provided, rows become clickable and invoke this callback */
  onRowPress?: (item: T) => void;
}

export function AdminDataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'No data found',
  pageSize = 10,
  enablePagination = true,
  maxBodyHeight,
  actions,
  onRowPress,
}: AdminDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const totalTableWidth = useMemo(() => {
    const colCount = columns.length + (actions ? 1 : 0);
    const sumWidths = columns.reduce((acc, c) => acc + (c.width ?? 150), 0) + (actions ? 120 : 0);
    return sumWidths + (colCount - 1) * COLUMN_GAP;
  }, [columns, actions]);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? '';
      const bVal = (b as any)[sortKey] ?? '';
      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortKey, sortAsc]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);
  const tableData = enablePagination ? pagedData : sortedData;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.tableCard, { minWidth: Math.max(totalTableWidth, 400) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <TouchableOpacity
                key={col.key}
                style={[styles.headerCell, col.width ? { width: col.width } : { flex: 1, minWidth: 120 }]}
                onPress={() => col.sortable && handleSort(col.key)}
                disabled={!col.sortable}
                activeOpacity={col.sortable ? 0.7 : 1}
              >
                <Text style={styles.headerText}>{col.label}</Text>
                {col.sortable && sortKey === col.key && (
                  <Ionicons
                    name={sortAsc ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.primary}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>
            ))}
            {actions && (
              <View style={[styles.headerCell, { width: 120 }]}>
                <Text style={styles.headerText}>Actions</Text>
              </View>
            )}
          </View>

          {/* Rows */}
          {tableData.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            <ScrollView
              style={[styles.bodyScroll, maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined]}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {tableData.map((item, index) => {
                const RowWrapper = onRowPress ? TouchableOpacity : View;
                const rowProps = onRowPress
                  ? { onPress: () => onRowPress(item), activeOpacity: 0.7 }
                  : {};
                return (
                  <RowWrapper
                    key={keyExtractor(item)}
                    style={[styles.dataRow, index % 2 === 0 && styles.dataRowAlt]}
                    {...rowProps}
                  >
                    {columns.map((col) => (
                      <View
                        key={col.key}
                        style={[styles.dataCell, col.width ? { width: col.width } : { flex: 1, minWidth: 120 }]}
                      >
                        {col.render ? (
                          col.render(item)
                        ) : (
                          <Text style={styles.cellText} numberOfLines={1}>
                            {String((item as any)[col.key] ?? '—')}
                          </Text>
                        )}
                      </View>
                    ))}
                    {actions && (
                      <View style={[styles.dataCell, { width: 120 }]}>
                        {actions(item)}
                      </View>
                    )}
                  </RowWrapper>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <View style={[styles.pagination, styles.tableCard, styles.paginationCard, { minWidth: Math.max(totalTableWidth, 400) }]}>
          <Text style={styles.pageInfo}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedData.length)} of{' '}
            {sortedData.length}
          </Text>
          <View style={styles.pageButtons}>
            <TouchableOpacity
              style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
              onPress={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <Ionicons name="chevron-back" size={18} color={page === 0 ? colors.textTertiary : colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pageNumber}>
              {page + 1} / {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.pageButton, page >= totalPages - 1 && styles.pageButtonDisabled]}
              onPress={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              <Ionicons name="chevron-forward" size={18} color={page >= totalPages - 1 ? colors.textTertiary : colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const COLUMN_GAP = 16;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minWidth: 0,
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.sm,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: COLUMN_GAP,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: COLUMN_GAP,
  },
  dataRowAlt: {
    backgroundColor: colors.background,
  },
  dataCell: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  cellText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  emptyRow: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  bodyScroll: {
    width: '100%',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  paginationCard: {
    marginTop: spacing.sm,
  },
  pageInfo: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pageButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageNumber: {
    ...typography.captionMedium,
    color: colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
});
