import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { updateRecord } from '../../services/firebase/realtimeDb';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import type { DashboardStackParamList, Business } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'BusinessGiven'>;
type TabKey = 'given' | 'received' | 'pending';

function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
}

function formatType(type: string): string {
    if (type === 'ask_board') return 'Ask Board';
    if (type === 'one_on_one') return 'B2B';
    if (type === 'referral') return 'Referral';
    return type;
}

const BusinessGivenScreen: React.FC<Props> = ({ navigation }) => {
    const { t } = useTranslation();
    const currentUser = useAuthStore((s) => s.user);
    const { items: allBusiness, loading } = useRealtimeCollection<Business>('business');

    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('received');

    // Show business entries involving the current user, filtered by tab
    const userBusiness = useMemo(() => {
        if (!currentUser?.uid) return [];
        return allBusiness.filter((b) => {
            if (activeTab === 'given') {
                return b.givenById === currentUser.uid && (b.status === 'approved' || !b.status);
            }
            if (activeTab === 'received') {
                return b.givenToId === currentUser.uid && b.status !== 'rejected';
            }
            if (activeTab === 'pending') {
                // Pending approvals are shown to the giver (business received-from person).
                return b.givenById === currentUser.uid && b.status === 'pending';
            }
            return false;
        });
    }, [allBusiness, currentUser?.uid, activeTab]);

    // Apply filters
    const filteredBusiness = useMemo(() => {
        let result = userBusiness;

        // Search by name or chapter
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(
                (b) =>
                    (b.name || '').toLowerCase().includes(q) ||
                    (b.chapterName || '').toLowerCase().includes(q) ||
                    (b.givenToName || '').toLowerCase().includes(q) ||
                    (b.givenByName || '').toLowerCase().includes(q),
            );
        }

        // Date range filter
        if (dateFrom) {
            result = result.filter((b) => (b.date || '') >= dateFrom);
        }
        if (dateTo) {
            result = result.filter((b) => (b.date || '') <= dateTo);
        }

        // Sort by date descending
        return result.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [userBusiness, searchQuery, dateFrom, dateTo]);

    const renderHeader = () => (
        <View style={styles.headerSection}>
            <View style={styles.titleRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Business</Text>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.actionsRow}>
                <Button
                    title="Add Business"
                    onPress={() => navigation.navigate('AddBusiness')}
                    icon="add-circle-outline"
                    size="sm"
                />
                <TouchableOpacity
                    style={styles.filterToggle}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Ionicons
                        name={showFilters ? 'filter' : 'filter-outline'}
                        size={20}
                        color={showFilters ? colors.primary : colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>

            {showFilters && (
                <View style={styles.filtersContainer}>
                    <View style={styles.searchRow}>
                        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search name, chapter..."
                            placeholderTextColor={colors.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <View style={styles.dateFiltersRow}>
                        <View style={styles.dateField}>
                            <Text style={styles.dateLabel}>From</Text>
                            <TextInput
                                style={styles.dateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textTertiary}
                                value={dateFrom}
                                onChangeText={setDateFrom}
                            />
                        </View>
                        <View style={styles.dateField}>
                            <Text style={styles.dateLabel}>To</Text>
                            <TextInput
                                style={styles.dateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.textTertiary}
                                value={dateTo}
                                onChangeText={setDateTo}
                            />
                        </View>
                        {(dateFrom || dateTo) ? (
                            <TouchableOpacity
                                style={styles.clearDates}
                                onPress={() => { setDateFrom(''); setDateTo(''); }}
                            >
                                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            )}

            {/* Tabs */}
            <View style={styles.tabContainer}>
                {(['received', 'given', 'pending'] as TabKey[]).map((tab) => {
                    const count = tab === 'pending'
                        ? allBusiness.filter((b) => b.givenById === currentUser?.uid && b.status === 'pending').length
                        : 0;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                            {count > 0 && tab === 'pending' && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>{count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
        try {
            await updateRecord(`business/${id}`, { status: newStatus });
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const renderBusinessItem = ({ item }: { item: Business }) => {
        const relationship = (() => {
            if (activeTab === 'received') {
                return {
                    icon: 'arrow-down-circle-outline' as const,
                    color: colors.accent,
                    text: `Received from ${item.givenByName}`,
                };
            }
            if (activeTab === 'pending') {
                return {
                    icon: 'time-outline' as const,
                    color: colors.warning,
                    text: `Approval request from ${item.givenToName}`,
                };
            }
            return {
                icon: 'arrow-up-circle-outline' as const,
                color: colors.success,
                text: `Received by ${item.givenToName}`,
            };
        })();
        const isPending = item.status === 'pending';

        return (
            <Card style={styles.rowCard}>
                <View style={styles.rowTop}>
                    <View style={styles.rowDateWrap}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                        <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                    </View>
                    <View
                        style={[
                            styles.typeBadge,
                            item.type === 'ask_board'
                                ? styles.typeBadgeAsk
                                : item.type === 'referral'
                                    ? styles.typeBadgeReferral
                                    : styles.typeBadgeOneOnOne,
                        ]}
                    >
                        <Text
                            style={[
                                styles.typeBadgeText,
                                item.type === 'ask_board'
                                    ? styles.typeBadgeTextAsk
                                    : item.type === 'referral'
                                        ? styles.typeBadgeTextReferral
                                        : styles.typeBadgeTextOneOnOne,
                            ]}
                        >
                            {formatType(item.type)}
                        </Text>
                    </View>
                </View>

                <Text style={styles.rowName}>{item.name}</Text>

                <View style={styles.rowDetails}>
                    <View style={styles.detailItem}>
                        <Ionicons name="business-outline" size={14} color={colors.textTertiary} />
                        <Text style={styles.detailText}>{item.chapterName || '-'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons
                            name={relationship.icon}
                            size={14}
                            color={relationship.color}
                        />
                        <Text style={styles.detailText}>
                            {relationship.text}
                        </Text>
                    </View>
                    {item.referredByName ? (
                        <View style={styles.detailItem}>
                            <Ionicons name="person-add-outline" size={14} color={colors.info} />
                            <Text style={styles.detailText}>Ref by: {item.referredByName}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={[styles.rowBottom, isPending && styles.rowBottomPending]}>
                    {isPending && (
                        <View style={styles.pendingBadge}>
                            <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
                            <Text style={styles.pendingBadgeText}>Pending</Text>
                        </View>
                    )}
                    <Text style={styles.rowAmount}>{formatCurrency(item.amount)}</Text>
                </View>

                {activeTab === 'pending' && (
                    <View style={styles.actionButtonsRow}>
                        <Button
                            title="Accept"
                            onPress={() => handleAction(item.id, 'approved')}
                            size="sm"
                            style={styles.actionBtn}
                        />
                        <Button
                            title="Reject"
                            onPress={() => handleAction(item.id, 'rejected')}
                            variant="outline"
                            size="sm"
                            style={styles.actionBtn}
                        />
                    </View>
                )}
            </Card>
        );
    };

    return (
        <ScreenWrapper scrollable={false} padded={false}>
            <FlatList
                data={filteredBusiness}
                keyExtractor={(item) => item.id}
                renderItem={renderBusinessItem}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading ? (
                        <EmptyState
                            icon="briefcase-outline"
                            title="No Business Entries"
                            message="Your business transactions will appear here. Tap 'Add Business' to record your first entry."
                        />
                    ) : null
                }
            />
        </ScreenWrapper>
    );
};

export default BusinessGivenScreen;

const styles = StyleSheet.create({
    headerSection: {
        paddingHorizontal: layout.screenPadding,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    backButton: {
        marginRight: spacing.md,
        padding: spacing.xs,
    },
    screenTitle: {
        ...typography.h3,
        color: colors.text,
        flex: 1,
    },
    headerSpacer: {
        width: 36,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    filterToggle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filtersContainer: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadows.sm,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        ...typography.body,
        color: colors.text,
        paddingVertical: spacing.xs,
    },
    dateFiltersRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.md,
    },
    dateField: {
        flex: 1,
    },
    dateLabel: {
        ...typography.caption,
        color: colors.textTertiary,
        marginBottom: spacing.xs,
    },
    dateInput: {
        ...typography.bodySmall,
        color: colors.text,
        backgroundColor: colors.surfaceVariant,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    clearDates: {
        padding: spacing.sm,
        marginBottom: spacing.xs,
    },
    listContent: {
        paddingBottom: spacing['4xl'],
    },
    rowCard: {
        position: 'relative',
        marginHorizontal: layout.screenPadding,
        marginTop: spacing.md,
    },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    rowDateWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    rowDate: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    typeBadge: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    typeBadgeAsk: {
        backgroundColor: colors.accentFaded,
    },
    typeBadgeOneOnOne: {
        backgroundColor: colors.infoLight,
    },
    typeBadgeReferral: {
        backgroundColor: colors.secondaryFaded,
    },
    typeBadgeText: {
        ...typography.captionMedium,
    },
    typeBadgeTextAsk: {
        color: colors.accent,
    },
    typeBadgeTextOneOnOne: {
        color: colors.info,
    },
    typeBadgeTextReferral: {
        color: colors.secondary,
    },
    rowName: {
        ...typography.bodySemiBold,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    rowDetails: {
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    detailText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    rowBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: spacing.sm,
    },
    rowBottomPending: {
        justifyContent: 'space-between',
    },
    rowAmount: {
        ...typography.bodySemiBold,
        color: colors.success,
        marginLeft: 'auto',
    },
    tabContainer: {
        flexDirection: 'row',
        marginTop: spacing.sm,
        backgroundColor: colors.surfaceVariant,
        borderRadius: borderRadius.md,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.sm,
        flexDirection: 'row',
        gap: 6,
    },
    tabButtonActive: {
        backgroundColor: colors.surface,
        ...shadows.sm,
    },
    tabText: {
        ...typography.bodySmallMedium,
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    tabBadge: {
        backgroundColor: colors.error,
        borderRadius: 10,
        height: 20,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    tabBadgeText: {
        ...typography.caption,
        color: colors.textInverse,
        fontWeight: 'bold',
        fontSize: 10,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingTop: spacing.md,
        marginTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    actionBtn: {
        flex: 1,
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
        backgroundColor: colors.warning + '15',
        marginRight: 0,
    },
    pendingBadgeText: {
        ...typography.captionMedium,
        color: colors.warning,
    },
});
