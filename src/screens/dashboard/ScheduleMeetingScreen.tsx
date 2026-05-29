import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
  ScrollView,
  TextInput as RNTextInput,
  Modal,
  Animated,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ref, get, push, set } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Section } from '../../components/layout/Section';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useDropdownMaxHeight } from '../../hooks/useKeyboardHeight';
import { colors, typography, spacing, borderRadius, layout, breakpoints, shadows } from '../../theme';
import type { DashboardStackParamList, User } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'ScheduleMeeting'>;

const isWeb = Platform.OS === 'web';

// ── Success Modal ──────────────────────────────────────────────────────────────

type SuccessVariant = 'meeting' | 'referral';

function SuccessModal({
  visible,
  memberName,
  variant,
  onDone,
}: {
  visible: boolean;
  memberName: string;
  variant: SuccessVariant;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const isReferral = variant === 'referral';
  const title = isReferral ? t('referrals.referralGivenTitle', 'Referral given!') : t('meetings.meetingScheduled');
  const message = isReferral
    ? t('referrals.referralGivenMessage', 'Your referral has been recorded for {{name}}.', { name: memberName })
    : t('meetings.meetingScheduledMessage') + ' ';
  const buttonText = isReferral ? t('referrals.goToReferrals', 'Go to Referrals') : t('interactions.viewInteractions');
  const buttonIcon = isReferral ? 'git-network-outline' : 'chatbubbles-outline';

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={modalStyles.overlay}>
        <Animated.View style={[modalStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={modalStyles.iconCircle}>
            <Ionicons name="checkmark-circle" size={56} color="#10B981" />
          </View>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>
            {isReferral ? message : <>{message}<Text style={modalStyles.memberName}>{memberName}</Text></>}
          </Text>
          <TouchableOpacity style={modalStyles.button} onPress={onDone} activeOpacity={0.8}>
            <Ionicons name={buttonIcon as any} size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={modalStyles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    ...shadows.lg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  memberName: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    minHeight: 48,
  },
  buttonText: {
    ...typography.bodyMedium,
    color: '#fff',
  },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

const ScheduleMeetingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWideWeb = isWeb && width > breakpoints.lg;
  const preselectedUserId = route.params?.userId;
  const askId = route.params?.askId;
  const askDescription = route.params?.askDescription ?? '';
  const currentUser = useAuthStore((s) => s.user);

  const isGiveReferralMode = !!askId;

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactNumber, setContactNumber] = useState('');

  // Member picker state (in give-referral mode: name can be free text or selected member)
  const [members, setMembers] = useState<User[]>([]);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchInputRef = useRef<RNTextInput>(null);

  // Field-level validation errors
  const [errors, setErrors] = useState<{ member?: string; date?: string; time?: string; contactNumber?: string }>({});
  const dropdownMaxHeight = useDropdownMaxHeight(300);

  // Success modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMemberName, setSuccessMemberName] = useState('');

  // Load members from RTDB
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const snap = await get(ref(rtdb, 'users'));
        if (snap.exists()) {
          const val = snap.val();
          const list = Object.entries(val)
            .map(([key, data]) => ({ ...(data as any), uid: key } as User))
            .filter((u) => u.uid !== currentUser?.uid && u.role !== 'admin' && u.role !== 'superadmin');
          setMembers(list);

          if (preselectedUserId) {
            const found = list.find((m) => m.uid === preselectedUserId);
            if (found) {
              setSelectedMember(found);
              setMemberSearch(found.name);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load members:', err);
      }
    };
    loadMembers();
  }, [preselectedUserId, currentUser?.uid]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.businessName.toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSelectMember = (member: User) => {
    setSelectedMember(member);
    setMemberSearch(member.name);
    if (member.phone) setContactNumber(member.phone);
    setDropdownOpen(false);
    if (errors.member) setErrors((prev) => ({ ...prev, member: undefined }));
    if (errors.contactNumber) setErrors((prev) => ({ ...prev, contactNumber: undefined }));
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setMemberSearch('');
    setDropdownOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const showDropdown = dropdownOpen && memberSearch.trim().length > 0 && !selectedMember;

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (isGiveReferralMode) {
      const receiverName = selectedMember?.name ?? memberSearch.trim();
      if (!receiverName) newErrors.member = t('referrals.personNameRequired', 'Please enter the person\'s name.');
      const phone = selectedMember?.phone ?? contactNumber.trim();
      if (!phone) newErrors.contactNumber = t('referrals.contactNumberRequired', 'Please enter contact number.');
    } else {
      if (!selectedMember) newErrors.member = t('meetings.memberRequired');
      if (!selectedDate) newErrors.date = t('meetings.dateRequired');
      if (!selectedTime) newErrors.time = t('meetings.timeRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isGiveReferralMode && askId) {
        const receiverName = selectedMember?.name ?? memberSearch.trim();
        const receiverId = selectedMember?.uid ?? '';
        const phone = selectedMember?.phone ?? contactNumber.trim();
        const referralRef = push(ref(rtdb, 'referrals'));
        await set(referralRef, {
          giverId: currentUser?.uid || '',
          giverName: currentUser?.name || '',
          receiverId,
          receiverName,
          askId,
          businessDescription: askDescription || '',
          contactName: currentUser?.name || '',
          contactPhone: phone,
          status: 'pending',
          amount: 0,
          createdAt: new Date().toISOString(),
        });
        if (receiverId) {
          const notifRef = push(ref(rtdb, 'notifications'));
          await set(notifRef, {
            userId: receiverId,
            type: 'referral',
            title: t('referrals.referralReceivedTitle', 'You received a referral'),
            body: `${currentUser?.name || 'Someone'} ${t('referrals.gaveYouReferral', 'gave you a referral')}`,
            data: { referralId: referralRef.key || '', askId },
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
        setSuccessMemberName(receiverName);
        setShowSuccess(true);
      } else {
        const meetingRef = push(ref(rtdb, 'meetings'));
        await set(meetingRef, {
          requesterId: currentUser?.uid || '',
          requesterName: currentUser?.name || '',
          requesteeId: selectedMember!.uid,
          requesteeName: selectedMember!.name,
          type: 'one_on_one',
          status: 'pending',
          scheduledDate: selectedDate,
          scheduledTime: formatDisplayTime(selectedTime),
          notes: notes.trim(),
          createdAt: new Date().toISOString(),
        });

        const notifRef = push(ref(rtdb, 'notifications'));
        await set(notifRef, {
          userId: selectedMember!.uid,
          type: 'meeting',
          title: t('meetings.newInviteTitle'),
          body: `${currentUser?.name || 'Someone'} ${t('meetings.invitedYou')} on ${formatDisplayDate(selectedDate)} at ${formatDisplayTime(selectedTime)}`,
          data: { meetingId: meetingRef.key || '' },
          read: false,
          createdAt: new Date().toISOString(),
        });

        setSuccessMemberName(selectedMember!.name);
        setShowSuccess(true);
      }
    } catch (err) {
      console.error(isGiveReferralMode ? 'Failed to give referral' : 'Failed to schedule meeting:', err);
      if (isWeb) {
        window.alert(t('common.error'));
      } else {
        Alert.alert(t('common.error'), t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header
        title={isGiveReferralMode ? t('referrals.giveReferral', 'Give Referral') : t('meetings.scheduleMeeting')}
        onBack={() => navigation.goBack()}
      />

      <View style={[isWideWeb && styles.webFormContainer]}>
        {/* Person/Member name — in give-referral mode allows free text or select from list */}
        <Section title={isGiveReferralMode ? t('referrals.personName', "Person's name") : t('meetings.selectMember')}>
          <View style={[styles.searchInputContainer, dropdownOpen && styles.searchInputContainerFocused, errors.member ? styles.inputError : null]}>
            <Ionicons name={isGiveReferralMode ? 'person-outline' : 'search-outline'} size={18} color={colors.textTertiary} style={styles.searchIcon} />
            <RNTextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder={isGiveReferralMode ? t('referrals.personNamePlaceholder', 'Enter name or search member') : t('meetings.searchMembers')}
              placeholderTextColor={colors.textTertiary}
              value={memberSearch}
              onChangeText={(text) => {
                setMemberSearch(text);
                if (!selectedMember) setDropdownOpen(true);
              }}
              onFocus={() => {
                if (!selectedMember) setDropdownOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => setDropdownOpen(false), 200);
              }}
            />
            {(selectedMember || memberSearch.trim()) ? (
              <TouchableOpacity onPress={handleClearMember} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
          {errors.member ? <Text style={styles.errorText}>{errors.member}</Text> : null}

          {selectedMember && !dropdownOpen && (
            <View style={styles.selectedChip}>
              <Avatar uri={selectedMember.photoURL} name={selectedMember.name} size="xs" />
              <Text style={styles.selectedChipName}>{selectedMember.name}</Text>
              <Text style={styles.selectedChipBiz}>{selectedMember.businessName}</Text>
              <TouchableOpacity onPress={handleClearMember} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {showDropdown && (
            <ScrollView style={[styles.dropdownList, { maxHeight: dropdownMaxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filteredMembers.length === 0 && !isGiveReferralMode ? (
                <Text style={styles.emptyText}>{t('network.noMembers')}</Text>
              ) : filteredMembers.length === 0 && isGiveReferralMode ? (
                <Text style={styles.emptyText}>{t('referrals.typeNameIfNotMember', 'Type name above if not in list')}</Text>
              ) : (
                filteredMembers.map((member) => (
                  <TouchableOpacity
                    key={member.uid}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectMember(member)}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={member.photoURL} name={member.name} size="sm" />
                    <View style={styles.dropdownItemInfo}>
                      <Text style={styles.dropdownItemName}>{member.name}</Text>
                      <Text style={styles.dropdownItemBiz}>{member.businessName}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </Section>

        {/* Contact number — only in give-referral mode (or show when member not selected so we can capture phone) */}
        {isGiveReferralMode && (
          <Section title={t('referrals.contactNumber', 'Contact number')}>
            <TextInput
              placeholder={t('referrals.contactNumberPlaceholder', 'Enter contact number')}
              value={selectedMember?.phone ?? contactNumber}
              onChangeText={(text) => {
                setContactNumber(text);
                if (errors.contactNumber) setErrors((p) => ({ ...p, contactNumber: undefined }));
              }}
              keyboardType="phone-pad"
              style={errors.contactNumber ? styles.inputError : undefined}
            />
            {errors.contactNumber ? <Text style={styles.errorText}>{errors.contactNumber}</Text> : null}
          </Section>
        )}

        {/* Date & Time — only when scheduling meeting */}
        {!isGiveReferralMode && (
          isWideWeb ? (
            <View style={styles.webDateTimeRow}>
              <View style={styles.webDateTimeCol}>
                <Section title={t('meetings.date')}>
                  <DatePickerField value={selectedDate} onChange={(v) => { setSelectedDate(v); if (errors.date) setErrors((p) => ({ ...p, date: undefined })); }} min={todayStr} hasError={!!errors.date} />
                  {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
                </Section>
              </View>
              <View style={styles.webDateTimeCol}>
                <Section title={t('meetings.time')}>
                  <TimePickerField value={selectedTime} onChange={(v) => { setSelectedTime(v); if (errors.time) setErrors((p) => ({ ...p, time: undefined })); }} hasError={!!errors.time} />
                  {errors.time ? <Text style={styles.errorText}>{errors.time}</Text> : null}
                </Section>
              </View>
            </View>
          ) : (
            <>
              <Section title={t('meetings.date')}>
                <DatePickerField value={selectedDate} onChange={(v) => { setSelectedDate(v); if (errors.date) setErrors((p) => ({ ...p, date: undefined })); }} min={todayStr} hasError={!!errors.date} />
                {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
              </Section>
              <Section title={t('meetings.time')}>
                <TimePickerField value={selectedTime} onChange={(v) => { setSelectedTime(v); if (errors.time) setErrors((p) => ({ ...p, time: undefined })); }} hasError={!!errors.time} />
                {errors.time ? <Text style={styles.errorText}>{errors.time}</Text> : null}
              </Section>
            </>
          )
        )}

        {/* Notes / Message — only when scheduling meeting */}
        {!isGiveReferralMode && (
          <Section title={t('meetings.message')}>
            <TextInput
              placeholder={t('meetings.messagePlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              icon="chatbubble-ellipses-outline"
            />
          </Section>
        )}

        {/* Submit */}
        <View style={styles.submitContainer}>
          <Button
            title={isGiveReferralMode ? t('referrals.giveReferral', 'Give Referral') : t('meetings.sendInvite')}
            onPress={handleSubmit}
            loading={isSubmitting}
            fullWidth
            icon={isGiveReferralMode ? 'hand-right-outline' : 'send-outline'}
            style={styles.submitButton}
          />
        </View>
      </View>

      {/* Success popup */}
      <SuccessModal
        visible={showSuccess}
        memberName={successMemberName}
        variant={isGiveReferralMode ? 'referral' : 'meeting'}
        onDone={() => {
          setShowSuccess(false);
          if (isGiveReferralMode) {
            navigation.replace('ReferralStatus');
          } else {
            navigation.replace('Interactions');
          }
        }}
      />
    </ScreenWrapper>
  );
};

// ── Date Picker Field ─────────────────────────────────────────────────────────

function DatePickerField({ value, onChange, min, hasError }: { value: string; onChange: (v: string) => void; min?: string; hasError?: boolean }) {
  const [show, setShow] = useState(false);

  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const minDate = min ? new Date(min + 'T00:00:00') : undefined;

  if (isWeb) {
    return (
      <View style={[pickerStyles.container, hasError && pickerStyles.containerError]}>
        <Ionicons name="calendar-outline" size={20} color={value ? colors.primary : colors.textTertiary} style={pickerStyles.icon} />
        <input
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: 16,
            color: value ? '#1A1A2E' : '#9CA3AF',
            fontFamily: 'inherit',
            padding: '12px 16px 12px 0',
            cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) {
      setShow(false);
      return;
    }
    setShow(Platform.OS === 'ios');
    const iso = date.toISOString().split('T')[0];
    onChange(iso);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.8}
        style={[pickerStyles.container, hasError && pickerStyles.containerError]}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={value ? colors.primary : colors.textTertiary}
          style={pickerStyles.icon}
        />
        <Text style={{ flex: 1, color: value ? colors.text : colors.textTertiary }}>
          {value || 'YYYY-MM-DD'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={initialDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minDate}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

// ── Time Picker Field ─────────────────────────────────────────────────────────

function TimePickerField({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError?: boolean }) {
  const [show, setShow] = useState(false);

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    if (!isNaN(h) && !isNaN(m)) {
      d.setHours(h);
      d.setMinutes(m);
      d.setSeconds(0);
      d.setMilliseconds(0);
    }
    return d;
  };

  const initialDate = value ? parseTime(value) : new Date();

  if (isWeb) {
    return (
      <View style={[pickerStyles.container, hasError && pickerStyles.containerError]}>
        <Ionicons name="time-outline" size={20} color={value ? colors.primary : colors.textTertiary} style={pickerStyles.icon} />
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: 16,
            color: value ? '#1A1A2E' : '#9CA3AF',
            fontFamily: 'inherit',
            padding: '12px 16px 12px 0',
            cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) {
      setShow(false);
      return;
    }
    setShow(Platform.OS === 'ios');
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.8}
        style={[pickerStyles.container, hasError && pickerStyles.containerError]}
      >
        <Ionicons
          name="time-outline"
          size={20}
          color={value ? colors.primary : colors.textTertiary}
          style={pickerStyles.icon}
        />
        <Text style={{ flex: 1, color: value ? colors.text : colors.textTertiary }}>
          {value || 'HH:MM'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={initialDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: colors.border, minHeight: 52, marginBottom: spacing.xs },
  containerError: { borderColor: '#EF4444' },
  icon: { marginLeft: spacing.lg, marginRight: spacing.sm },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return timeStr; }
}

export default ScheduleMeetingScreen;

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  webFormContainer: {
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },

  // ── Search Input ──
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  searchInputContainerFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    ...(isWeb ? { outlineStyle: 'none' as any } : {}),
  },

  // ── Error text ──
  errorText: {
    ...typography.caption,
    color: '#EF4444',
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },

  // ── Selected member chip ──
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  selectedChipName: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  selectedChipBiz: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },

  // ── Inline dropdown ──
  dropdownList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    maxHeight: 300,
    overflow: 'hidden',
    ...shadows.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  dropdownItemName: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  dropdownItemBiz: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // ── Date/Time ──
  webDateTimeRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  webDateTimeCol: {
    flex: 1,
  },

  // ── Notes ──
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // ── Submit ──
  submitContainer: {
    paddingHorizontal: spacing.xl,
  },
  submitButton: {
    marginTop: spacing['2xl'],
    marginBottom: spacing['3xl'],
  },

  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing['2xl'],
  },
});
