import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, TextInput as RNTextInput, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { useDropdownMaxHeight } from '../../hooks/useKeyboardHeight';
import { createCollectionItem } from '../../services/firebase/realtimeDb';
import { openWhatsAppWithMessage, getEventShareLink } from '../../utils/helpers';
import { isEventVisibleToChapter } from '../../utils/eventAudience';
import { spacing, layout, colors, typography, borderRadius } from '../../theme';
import type { DashboardStackParamList, Event } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'InviteVisitor'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const now = () => new Date().toISOString().slice(0, 10);

const InviteVisitorScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { items: events } = useRealtimeCollection<Event>('events');
  const dropdownMaxHeight = useDropdownMaxHeight(200);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventSearch, setEventSearch] = useState('');
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const eventInputRef = useRef<RNTextInput | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [errors, setErrors] = useState<{
    event?: string;
    name?: string;
    email?: string;
    contactNumber?: string;
    businessName?: string;
  }>({});

  const upcomingEvents = useMemo(
    () => events
      .filter((e) => (e.date || '').slice(0, 10) >= now())
      .filter((e) => isEventVisibleToChapter(e, user?.chapterId))
      .sort((a, b) => (a.date || '').localeCompare(b.date || '')),
    [events, user?.chapterId],
  );

  const filteredEvents = useMemo(() => {
    const q = eventSearch.toLowerCase().trim();
    if (!q) return upcomingEvents;
    return upcomingEvents.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q),
    );
  }, [upcomingEvents, eventSearch]);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};
    if (!selectedEvent) nextErrors.event = t('inviteVisitor.errorEvent', 'Please select an event');
    if (!name.trim()) nextErrors.name = t('inviteVisitor.errorName', 'Name is required');
    if (!email.trim()) {
      nextErrors.email = t('inviteVisitor.errorEmail', 'Email is required');
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = t('inviteVisitor.errorEmailInvalid', 'Enter a valid email');
    }
    const cleanedPhone = contactNumber.replace(/\D/g, '');
    if (!cleanedPhone) {
      nextErrors.contactNumber = t('inviteVisitor.errorContact', 'Contact number is required');
    } else if (cleanedPhone.length !== 10) {
      nextErrors.contactNumber = t('inviteVisitor.errorContactInvalid', 'Enter a valid contact number');
    }
    if (!businessName.trim()) {
      nextErrors.businessName = t('inviteVisitor.errorBusinessName', 'Business name is required');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSendInvite = async () => {
    if (!validate() || !selectedEvent) return;

    setIsSending(true);
    try {
      await createCollectionItem('visitorInvites', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        contactNumber: contactNumber.replace(/\D/g, ''),
        businessName: businessName.trim(),
        inviterUid: user?.uid || '',
        inviterName: user?.name || '',
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const eventLink = getEventShareLink(selectedEvent.id);
      const message = t('inviteVisitor.inviteMessage', 'You have been invited to the event *{{eventName}}* by *{{inviterName}}*.\n\nEvent link: {{eventLink}}', {
        eventName: selectedEvent.title,
        inviterName: user?.name || 'A member',
        eventLink,
      });
      const whatsappUrl = openWhatsAppWithMessage(contactNumber, message);
      try {
        await Linking.openURL(whatsappUrl);
      } catch {
        // ignore if WhatsApp not available
      }
      Alert.alert(
        t('inviteVisitor.successTitle', 'Invite Sent'),
        t('inviteVisitor.successMessage', 'Visitor invite has been sent. Opening WhatsApp to share the event.'),
        [{ text: t('common.ok', 'OK'), onPress: () => navigation.goBack() }],
      );
      setSelectedEvent(null);
      setEventSearch('');
      setName('');
      setEmail('');
      setContactNumber('');
      setBusinessName('');
      setErrors({});
    } catch {
      Alert.alert(
        t('common.error', 'Error'),
        t('inviteVisitor.errorSend', 'Failed to send invite. Please try again.'),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ScreenWrapper padded={false}>
      <Header
        title={t('inviteVisitor.title', 'Invite Visitor')}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.container}>
        <Card style={styles.formCard}>
          <Text style={styles.inputLabel}>{t('inviteVisitor.event', 'Event')}</Text>
          <View style={styles.dropdownWrapper}>
            <View
              style={[
                styles.dropdownInputRow,
                eventDropdownOpen && styles.dropdownInputRowFocused,
                errors.event && styles.dropdownInputRowError,
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
              <RNTextInput
                ref={eventInputRef}
                style={styles.dropdownSearchInput}
                value={selectedEvent ? selectedEvent.title : eventSearch}
                onChangeText={(text) => {
                  if (!selectedEvent) {
                    setEventSearch(text);
                    setEventDropdownOpen(true);
                  }
                }}
                onFocus={() => {
                  if (!selectedEvent) setEventDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setEventDropdownOpen(false), 180)}
                placeholder={t('inviteVisitor.selectEvent', 'Search or select event')}
                placeholderTextColor={colors.textTertiary}
                editable={!selectedEvent}
              />
              {selectedEvent ? (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedEvent(null);
                    setEventSearch('');
                    setErrors((prev) => ({ ...prev, event: undefined }));
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setEventDropdownOpen((prev) => !prev);
                    setTimeout(() => eventInputRef.current?.focus?.(), 0);
                  }}
                  activeOpacity={0.7}
                  style={styles.dropdownChevronButton}
                >
                  <Ionicons name={eventDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            {eventDropdownOpen && !selectedEvent && (
              <ScrollView
                style={[styles.dropdownList, { maxHeight: dropdownMaxHeight }]}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {filteredEvents.length === 0 ? (
                  <Text style={styles.emptyDropdownText}>
                    {upcomingEvents.length === 0
                      ? t('events.noEventsMessage', 'No upcoming events')
                      : t('events.noEvents', 'No events found')}
                  </Text>
                ) : (
                  filteredEvents.map((ev) => (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedEvent(ev);
                        setEventSearch('');
                        setEventDropdownOpen(false);
                        setErrors((prev) => ({ ...prev, event: undefined }));
                      }}
                    >
                      <Text style={styles.dropdownItemText} numberOfLines={1}>{ev.title}</Text>
                      <Text style={styles.dropdownItemSubtext} numberOfLines={1}>
                        {ev.date} {ev.time}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
            {errors.event ? <Text style={styles.errorText}>{errors.event}</Text> : null}
          </View>

          <TextInput
            label={t('inviteVisitor.name', 'Name')}
            placeholder={t('inviteVisitor.namePlaceholder', 'Enter full name')}
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            icon="person-outline"
            error={errors.name}
            autoCapitalize="words"
          />

          <TextInput
            label={t('inviteVisitor.email', 'Email')}
            placeholder={t('inviteVisitor.emailPlaceholder', 'you@example.com')}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            icon="mail-outline"
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            label={t('inviteVisitor.contactNumber', 'Contact Number')}
            placeholder={t('inviteVisitor.contactPlaceholder', '9876543210')}
            value={contactNumber}
            onChangeText={(value) => {
              setContactNumber(value.replace(/\D/g, '').slice(0, 10));
              if (errors.contactNumber) setErrors((prev) => ({ ...prev, contactNumber: undefined }));
            }}
            icon="call-outline"
            error={errors.contactNumber}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <TextInput
            label={t('inviteVisitor.businessName', 'Business Name')}
            placeholder={t('inviteVisitor.businessNamePlaceholder', 'Enter business name')}
            value={businessName}
            onChangeText={(value) => {
              setBusinessName(value);
              if (errors.businessName) setErrors((prev) => ({ ...prev, businessName: undefined }));
            }}
            icon="briefcase-outline"
            error={errors.businessName}
          />

          <Button
            title={t('inviteVisitor.sendInvite', 'Send Invite')}
            onPress={handleSendInvite}
            loading={isSending}
            disabled={isSending}
            fullWidth
            icon="send-outline"
            iconPosition="right"
            style={styles.submitButton}
          />
        </Card>
      </View>
    </ScreenWrapper>
  );
};

export default InviteVisitorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    width: '100%',
    maxWidth: layout.maxFormWidth,
    alignSelf: 'center',
  },
  formCard: {
    padding: spacing.xl,
  },
  inputLabel: {
    ...typography.bodySmallMedium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dropdownWrapper: {
    marginBottom: spacing.lg,
  },
  dropdownInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    gap: spacing.sm,
  },
  dropdownInputRowFocused: {
    borderColor: colors.primary,
  },
  dropdownInputRowError: {
    borderColor: colors.error,
  },
  dropdownSearchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    padding: 0,
    margin: 0,
  },
  dropdownChevronButton: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
  },
  dropdownList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.text,
  },
  dropdownItemSubtext: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  emptyDropdownText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
