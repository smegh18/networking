import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { createCollectionItem } from '../../services/firebase/realtimeDb';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../../theme';
import type { DashboardStackParamList, Business, BusinessType, Chapter, User } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'AddBusiness'>;

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
    { value: 'ask_board', label: 'Ask Board' },
    { value: 'one_on_one', label: 'B2B' },
    { value: 'referral', label: 'Referral' },
];

function normalizeText(value: unknown): string {
    return String(value ?? '').trim();
}

function isSelectableMember(user: User | null | undefined, currentUserId?: string): boolean {
    if (!user?.uid || user.uid === currentUserId) return false;
    if (user.isActive === false || user.profileComplete === false) return false;
    return normalizeText(user.name).length > 0;
}

function isValidChapter(chapter: Chapter | null | undefined): boolean {
    return !!chapter?.id && normalizeText(chapter.name).length > 0;
}

const AddBusinessScreen: React.FC<Props> = ({ navigation }) => {
    const currentUser = useAuthStore((s) => s.user);
    const { items: chapters } = useRealtimeCollection<Chapter>('chapters');
    const { items: users } = useRealtimeCollection<User>('users', 'uid');

    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [businessType, setBusinessType] = useState<BusinessType>('ask_board');
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);

    // Chapter inline search
    const [chapterQuery, setChapterQuery] = useState('');
    const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
    const [showChapterResults, setShowChapterResults] = useState(false);

    const [userQuery, setUserQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserResults, setShowUserResults] = useState(false);

    // Referred By inline search (only for referral type)
    const [referredByQuery, setReferredByQuery] = useState('');
    const [selectedReferredBy, setSelectedReferredBy] = useState<User | null>(null);
    const [showReferredByResults, setShowReferredByResults] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    const availableChapters = useMemo(
        () => chapters.filter((chapter) => isValidChapter(chapter)),
        [chapters],
    );

    const availableUsers = useMemo(
        () => users.filter((user) => isSelectableMember(user, currentUser?.uid)),
        [users, currentUser?.uid],
    );

    const filteredChapters = useMemo(() => {
        if (!chapterQuery.trim()) return availableChapters.slice(0, 10);
        const q = chapterQuery.trim().toLowerCase();
        return availableChapters
            .filter((c) => normalizeText(c.name).toLowerCase().includes(q))
            .slice(0, 10);
    }, [availableChapters, chapterQuery]);

    const filteredUsers = useMemo(() => {
        if (!userQuery.trim()) return availableUsers.slice(0, 10);
        const q = userQuery.trim().toLowerCase();
        return availableUsers
            .filter(
                (u) =>
                    normalizeText(u.name).toLowerCase().includes(q) ||
                    normalizeText(u.businessName).toLowerCase().includes(q),
            )
            .slice(0, 10);
    }, [availableUsers, userQuery]);

    const filteredReferredBy = useMemo(() => {
        if (!referredByQuery.trim()) return availableUsers.slice(0, 10);
        const q = referredByQuery.trim().toLowerCase();
        return availableUsers
            .filter(
                (u) =>
                    normalizeText(u.name).toLowerCase().includes(q) ||
                    normalizeText(u.businessName).toLowerCase().includes(q),
            )
            .slice(0, 10);
    }, [availableUsers, referredByQuery]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Validation', 'Please enter a business name');
            return;
        }
        if (!isValidChapter(selectedChapter)) {
            Alert.alert('Validation', 'Please select a chapter');
            return;
        }
        if (!isSelectableMember(selectedUser, currentUser?.uid)) {
            Alert.alert('Validation', 'Please select a person for "Business Received From"');
            return;
        }
        if (businessType === 'referral' && !isSelectableMember(selectedReferredBy, currentUser?.uid)) {
            Alert.alert('Validation', 'Please select who referred this business');
            return;
        }
        const amountNum = parseFloat(amount);
        if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
            Alert.alert('Validation', 'Please enter a valid amount');
            return;
        }
        if (!currentUser?.uid || !normalizeText(currentUser.name)) {
            Alert.alert('Validation', 'Your profile is incomplete. Please refresh your account and try again.');
            return;
        }

        setSubmitting(true);
        try {
            const chapter = selectedChapter as Chapter;
            const selectedMember = selectedUser as User;
            const referrer = selectedReferredBy as User | null;

            const chapterId = normalizeText(chapter.id);
            const chapterName = normalizeText(chapter.name);
            const givenById = normalizeText(selectedMember.uid);
            const givenByName = normalizeText(selectedMember.name);
            const givenToId = normalizeText(currentUser.uid);
            const givenToName = normalizeText(currentUser.name);
            const referredById = normalizeText(referrer?.uid);
            const referredByName = normalizeText(referrer?.name);

            const businessEntry: Omit<Business, 'id'> = {
                date,
                name: name.trim(),
                chapterId,
                chapterName,
                type: businessType,
                status: 'pending',
                // Business is recorded by the receiver; approval is requested from the giver.
                givenById,
                givenByName,
                givenToId,
                givenToName,
                ...(businessType === 'referral' && referredById && referredByName
                    ? { referredById, referredByName }
                    : {}),
                amount: amountNum,
                createdAt: new Date().toISOString(),
            };
            await createCollectionItem('business', businessEntry as unknown as Record<string, unknown>);
            navigation.navigate('BusinessGiven');
        } catch (error) {
            Alert.alert('Error', 'Failed to add business entry. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScreenWrapper uniformLayout>
            <View style={styles.titleRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Add Business</Text>
            </View>

            <Card style={styles.formCard}>
                {/* Date */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Date</Text>
                    <TextInput
                        style={styles.input}
                        value={date}
                        onChangeText={setDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textTertiary}
                    />
                </View>

                {/* Name */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Business Name / Description</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter business name or description"
                        placeholderTextColor={colors.textTertiary}
                    />
                </View>

                {/* Chapter - inline search */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Chapter Name</Text>
                    {selectedChapter ? (
                        <View style={styles.selectedPill}>
                            <Text style={styles.selectedPillText}>{normalizeText(selectedChapter.name)}</Text>
                            <TouchableOpacity onPress={() => { setSelectedChapter(null); setChapterQuery(''); }}>
                                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.searchInputRow}>
                                <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
                                <TextInput
                                    style={styles.searchInputField}
                                    value={chapterQuery}
                                    onChangeText={(text) => {
                                        setChapterQuery(text);
                                        setShowChapterResults(true);
                                    }}
                                    onFocus={() => setShowChapterResults(true)}
                                    placeholder="Search for a chapter..."
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>
                            {showChapterResults && filteredChapters.length > 0 && (
                                <View style={styles.dropdownList}>
                                    {filteredChapters.map((chapter) => (
                                        <TouchableOpacity
                                            key={chapter.id}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedChapter(chapter);
                                                setChapterQuery(normalizeText(chapter.name));
                                                setShowChapterResults(false);
                                            }}
                                        >
                                            <Ionicons name="business-outline" size={16} color={colors.primary} />
                                            <View style={styles.dropdownItemText}>
                                                <Text style={styles.dropdownItemTitle}>{normalizeText(chapter.name)}</Text>
                                                <Text style={styles.dropdownItemSub}>
                                                    {chapter.location?.city
                                                        ? `${chapter.location.city}, ${chapter.location.state || ''}`
                                                        : ''}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Type dropdown */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Type</Text>
                    <TouchableOpacity
                        style={styles.dropdownTrigger}
                        onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                    >
                        <Text style={styles.dropdownTriggerText}>
                            {BUSINESS_TYPES.find((bt) => bt.value === businessType)?.label || 'Select type'}
                        </Text>
                        <Ionicons
                            name={showTypeDropdown ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
                    {showTypeDropdown && (
                        <View style={styles.dropdownList}>
                            {BUSINESS_TYPES.map((bt) => (
                                <TouchableOpacity
                                    key={bt.value}
                                    style={[
                                        styles.dropdownItem,
                                        businessType === bt.value && styles.dropdownItemActive,
                                    ]}
                                    onPress={() => {
                                        setBusinessType(bt.value);
                                        setShowTypeDropdown(false);
                                        if (bt.value !== 'referral') {
                                            setSelectedReferredBy(null);
                                            setReferredByQuery('');
                                            setShowReferredByResults(false);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name={bt.value === 'ask_board' ? 'megaphone-outline' : bt.value === 'referral' ? 'git-network-outline' : 'people-outline'}
                                        size={16}
                                        color={businessType === bt.value ? colors.primary : colors.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.dropdownItemTitle,
                                            businessType === bt.value && styles.dropdownItemTitleActive,
                                        ]}
                                    >
                                        {bt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Business Received From - inline user search */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Business Received From</Text>
                    {selectedUser ? (
                        <View style={styles.selectedPill}>
                            <Text style={styles.selectedPillText}>{normalizeText(selectedUser.name)}</Text>
                            <Text style={styles.selectedPillSub}>{normalizeText(selectedUser.businessName)}</Text>
                            <TouchableOpacity onPress={() => { setSelectedUser(null); setUserQuery(''); }}>
                                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.searchInputRow}>
                                <Ionicons name="person-outline" size={16} color={colors.textTertiary} />
                                <TextInput
                                    style={styles.searchInputField}
                                    value={userQuery}
                                    onChangeText={(text) => {
                                        setUserQuery(text);
                                        setShowUserResults(true);
                                    }}
                                    onFocus={() => setShowUserResults(true)}
                                    placeholder="Search for a member..."
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </View>
                            {showUserResults && filteredUsers.length > 0 && (
                                <View style={styles.dropdownList}>
                                    {filteredUsers.map((u) => (
                                        <TouchableOpacity
                                            key={u.uid}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedUser(u);
                                                setUserQuery(normalizeText(u.name));
                                                setShowUserResults(false);
                                            }}
                                        >
                                            <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                                            <View style={styles.dropdownItemText}>
                                                <Text style={styles.dropdownItemTitle}>{normalizeText(u.name)}</Text>
                                                <Text style={styles.dropdownItemSub}>{normalizeText(u.businessName)}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </>
                    )}
                </View>

                {businessType === 'referral' ? (
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Referred By</Text>
                        {selectedReferredBy ? (
                            <View style={styles.selectedPill}>
                                <Text style={styles.selectedPillText}>{normalizeText(selectedReferredBy.name)}</Text>
                                <Text style={styles.selectedPillSub}>{normalizeText(selectedReferredBy.businessName)}</Text>
                                <TouchableOpacity onPress={() => { setSelectedReferredBy(null); setReferredByQuery(''); }}>
                                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.searchInputRow}>
                                    <Ionicons name="person-add-outline" size={16} color={colors.textTertiary} />
                                    <TextInput
                                        style={styles.searchInputField}
                                        value={referredByQuery}
                                        onChangeText={(text) => {
                                            setReferredByQuery(text);
                                            setShowReferredByResults(true);
                                        }}
                                        onFocus={() => setShowReferredByResults(true)}
                                        placeholder="Search for a member..."
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </View>
                                {showReferredByResults && filteredReferredBy.length > 0 && (
                                    <View style={styles.dropdownList}>
                                        {filteredReferredBy.map((u) => (
                                            <TouchableOpacity
                                                key={u.uid}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    setSelectedReferredBy(u);
                                                    setReferredByQuery(normalizeText(u.name));
                                                    setShowReferredByResults(false);
                                                }}
                                            >
                                                <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                                                <View style={styles.dropdownItemText}>
                                                    <Text style={styles.dropdownItemTitle}>{normalizeText(u.name)}</Text>
                                                    <Text style={styles.dropdownItemSub}>{normalizeText(u.businessName)}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                ) : null}

                {/* Amount */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Amount (₹)</Text>
                    <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="Enter amount"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                    />
                </View>

                <Button
                    title={submitting ? 'Submitting...' : 'Submit Business Entry'}
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={submitting}
                    fullWidth
                    icon="checkmark-circle-outline"
                    style={styles.submitButton}
                />
            </Card>
        </ScreenWrapper>
    );
};

export default AddBusinessScreen;

const styles = StyleSheet.create({
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    backButton: {
        marginRight: spacing.md,
        padding: spacing.xs,
    },
    screenTitle: {
        ...typography.h3,
        color: colors.text,
    },
    formCard: {
        marginBottom: spacing['2xl'],
    },
    fieldGroup: {
        marginBottom: spacing.xl,
    },
    label: {
        ...typography.bodySmallMedium,
        color: colors.text,
        marginBottom: spacing.sm,
    },
    input: {
        ...typography.body,
        color: colors.text,
        backgroundColor: colors.surfaceVariant,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    searchInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    searchInputField: {
        flex: 1,
        ...typography.body,
        color: colors.text,
        paddingVertical: spacing.md,
    },
    selectedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryFaded,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    selectedPillText: {
        ...typography.bodyMedium,
        color: colors.primary,
        flex: 1,
    },
    selectedPillSub: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceVariant,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    dropdownTriggerText: {
        ...typography.body,
        color: colors.text,
    },
    dropdownList: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginTop: spacing.xs,
        maxHeight: 200,
        ...shadows.md,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    dropdownItemActive: {
        backgroundColor: colors.primaryFaded,
    },
    dropdownItemText: {
        flex: 1,
    },
    dropdownItemTitle: {
        ...typography.bodySmallMedium,
        color: colors.text,
    },
    dropdownItemTitleActive: {
        color: colors.primary,
    },
    dropdownItemSub: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 1,
    },
    submitButton: {
        marginTop: spacing.md,
    },
});
