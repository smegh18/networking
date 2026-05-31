import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Section } from '../../components/layout/Section';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { createCollectionItem } from '../../services/firebase/realtimeDb';
import { colors, typography, spacing } from '../../theme';
import { MEETING_TYPES } from '../../utils/constants';
import type { NetworkStackParamList, User } from '../../types';

type Props = StackScreenProps<NetworkStackParamList, 'Request'>;

// ── Screen ─────────────────────────────────────────────────────────────────────

const RequestScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { userId, type } = route.params;
  const meetingType = type as keyof typeof MEETING_TYPES;
  const currentUser = useAuthStore((s) => s.user);
  const { items: users } = useRealtimeCollection<User>('users', 'uid');
  const recipient = users.find((user) => user.uid === userId);
  const recipientName = recipient?.name || t('common.member');

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const meetingConfig = MEETING_TYPES[meetingType];

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert(t('common.error'), t('meetings.fillRequired'));
      return;
    }
    if (!currentUser?.uid || !recipient?.uid) {
      Alert.alert(t('common.error'), t('common.somethingWentWrong', 'Something went wrong'));
      return;
    }
    setIsSubmitting(true);
    try {
      await createCollectionItem('meetings', {
        requesterId: currentUser.uid,
        requesterName: currentUser.name,
        requesteeId: recipient.uid,
        requesteeName: recipient.name,
        type: meetingType,
        status: 'pending',
        scheduledDate: selectedDate.trim(),
        scheduledTime: selectedTime.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      });
      setIsSubmitting(false);
      Alert.alert(t('meetings.success'), t('meetings.requestSent'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch {
      setIsSubmitting(false);
      Alert.alert(t('common.error'), t('meetings.requestFailed', 'Failed to send meeting request'));
    }
  };

  return (
    <ScreenWrapper>
      <Header title={t('request.title')} onBack={() => navigation.goBack()} />

      {/* Recipient Info */}
      <Card style={styles.recipientCard}>
        <View style={styles.recipientRow}>
          <Avatar name={recipientName} size="md" />
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{recipientName}</Text>
            <View style={styles.typeRow}>
              <Ionicons
                name={meetingConfig.icon as any}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.typeText}>{meetingConfig.label}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Date */}
      <Section title={t('meetings.selectDate')}>
        <TextInput
          placeholder={t('meetings.datePlaceholder')}
          value={selectedDate}
          onChangeText={setSelectedDate}
          icon="calendar-outline"
        />
      </Section>

      {/* Time */}
      <Section title={t('meetings.selectTime')}>
        <TextInput
          placeholder={t('meetings.timePlaceholder')}
          value={selectedTime}
          onChangeText={setSelectedTime}
          icon="time-outline"
        />
      </Section>

      {/* Notes */}
      <Section title={t('meetings.notes')}>
        <TextInput
          placeholder={t('meetings.notesPlaceholder')}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          style={styles.textArea}
          icon="document-text-outline"
        />
      </Section>

      {/* Confirm */}
      <Button
        title={t('request.confirm')}
        onPress={handleConfirm}
        loading={isSubmitting}
        fullWidth
        icon="send-outline"
        style={styles.confirmButton}
      />
    </ScreenWrapper>
  );
};

export default RequestScreen;

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  recipientCard: {
    marginBottom: spacing['3xl'],
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  recipientName: {
    ...typography.h4,
    color: colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  typeText: {
    ...typography.bodySmallMedium,
    color: colors.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  confirmButton: {
    marginTop: spacing['2xl'],
    marginBottom: spacing['3xl'],
  },
});
