import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { get, ref, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useRealtimeCollection } from '../../hooks/useRealtimeData';
import { useAuthStore } from '../../stores/authStore';
import { borderRadius, colors, spacing, typography } from '../../theme';
import type { DashboardStackParamList, Event } from '../../types';

type Props = StackScreenProps<DashboardStackParamList, 'EventAttendanceScanner'>;

function parseEventIdFromQr(value: string): string | null {
  const trimmed = value.trim();
  const directMatch = trimmed.match(/^netconnect:event-checkin:([^:]+)$/i);
  if (directMatch) return directMatch[1];

  const legacyMatch = trimmed.match(/^netconnect:attendance:([^:]+):([^:]+)$/i);
  if (legacyMatch) return legacyMatch[1];

  return null;
}

const EventAttendanceScannerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const currentUser = useAuthStore((s) => s.user);
  const { items: events } = useRealtimeCollection<Event>('events');
  const event = useMemo(() => events.find((item) => item.id === eventId) ?? null, [eventId, events]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [scanMessage, setScanMessage] = useState('');

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanState !== 'idle' || !currentUser) return;

    const scannedEventId = parseEventIdFromQr(data);
    if (!scannedEventId) {
      setScanMessage('This QR is not a valid event attendance code.');
      setScanState('done');
      return;
    }

    if (scannedEventId !== eventId) {
      setScanMessage('This QR belongs to a different event.');
      setScanState('done');
      return;
    }

    setScanState('saving');
    setScanMessage('');
    const nowIso = new Date().toISOString();

    try {
      const eventSnap = await get(ref(rtdb, `events/${eventId}`));
      if (!eventSnap.exists()) {
        throw new Error('Event not found.');
      }

      const latestEvent = { id: eventId, ...(eventSnap.val() as Omit<Event, 'id'>) } as Event;
      const today = new Date().toISOString().split('T')[0];
      const eventDay = String(latestEvent.date || '').split('T')[0];
      if (eventDay && eventDay !== today) {
        throw new Error('Attendance scanning is only available on the event date.');
      }

      const existingRecord = latestEvent.attendanceRecords?.[currentUser.uid];
      if (existingRecord && existingRecord.status !== 'absent') {
        throw new Error('Attendance already marked for this event.');
      }

      const getEventStartMs = () => {
        const datePart = String(latestEvent.date || '').split('T')[0];
        const timePart = String(latestEvent.time || '').trim();
        if (!datePart || !timePart) return null;
        const start = new Date(`${datePart}T${timePart}:00`).getTime();
        return Number.isNaN(start) ? null : start;
      };
      const startMs = getEventStartMs();
      const nowMs = new Date(nowIso).getTime();
      const status = startMs && !Number.isNaN(nowMs) && nowMs - startMs > 15 * 60 * 1000 ? 'late' : 'present';

      const checkedInUsers = new Set(latestEvent.checkedInUsers || []);
      checkedInUsers.add(currentUser.uid);

      await update(ref(rtdb, `events/${eventId}`), {
        attendanceRecords: {
          ...(latestEvent.attendanceRecords || {}),
          [currentUser.uid]: {
            ...(latestEvent.attendanceRecords?.[currentUser.uid] || {}),
            status,
            recordedAt: nowIso,
            updatedAt: nowIso,
            source: 'scanner',
            updatedBy: currentUser.uid,
            userName: currentUser.name,
            userPhone: currentUser.phone,
            userEmail: currentUser.email,
          },
        },
        checkedInUsers: Array.from(checkedInUsers),
        updatedAt: nowIso,
      });

      Alert.alert(
        'Attendance marked',
        `${currentUser.name} has been marked ${status} for ${event?.title || 'this event'}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to mark attendance right now. Please try again.';
      setScanMessage(message);
      setScanState('done');
    }
  };

  if (!permission) {
    return (
      <ScreenWrapper>
        <Header title="Scan Event QR" onBack={() => navigation.goBack()} />
      </ScreenWrapper>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenWrapper padded={false}>
        <Header title="Scan Event QR" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Card style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionText}>
              Allow camera access so you can scan the event QR and mark your attendance.
            </Text>
            <Button
              title="Allow Camera"
              onPress={() => requestPermission()}
              fullWidth
              size="lg"
              icon="camera-outline"
            />
          </Card>
        </View>
      </ScreenWrapper>
    );
  }

  if (event && currentUser) {
    const today = new Date().toISOString().split('T')[0];
    const eventDay = String(event.date || '').split('T')[0];
    const alreadyMarked = event.attendanceRecords?.[currentUser.uid]?.status
      && event.attendanceRecords?.[currentUser.uid]?.status !== 'absent';

    if (eventDay && eventDay !== today) {
      return (
        <ScreenWrapper>
          <Header title="Scan Event QR" onBack={() => navigation.goBack()} />
          <View style={styles.centered}>
            <Card style={styles.permissionCard}>
              <Text style={styles.permissionTitle}>Scan available on event day</Text>
              <Text style={styles.permissionText}>
                Attendance scanning is enabled only on the event date ({eventDay}).
              </Text>
              <Button title="Go Back" onPress={() => navigation.goBack()} fullWidth size="lg" icon="arrow-back-outline" />
            </Card>
          </View>
        </ScreenWrapper>
      );
    }

    if (alreadyMarked) {
      return (
        <ScreenWrapper>
          <Header title="Scan Event QR" onBack={() => navigation.goBack()} />
          <View style={styles.centered}>
            <Card style={styles.permissionCard}>
              <Text style={styles.permissionTitle}>Attendance marked</Text>
              <Text style={styles.permissionText}>
                You have already marked attendance for this event.
              </Text>
              <Button title="Go Back" onPress={() => navigation.goBack()} fullWidth size="lg" icon="checkmark-circle-outline" />
            </Card>
          </View>
        </ScreenWrapper>
      );
    }
  }

  return (
    <ScreenWrapper padded={false}>
      <Header title="Scan Event QR" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <View style={styles.cameraFrame}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanState === 'idle' ? handleBarcodeScanned : undefined}
          />
          <View style={styles.overlay}>
            <View style={styles.scanBox} />
          </View>
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>{event?.title || 'Event attendance'}</Text>
          <Text style={styles.infoText}>
            Point your camera at the QR code shown by the admin for this event.
          </Text>
          {scanMessage ? <Text style={styles.errorText}>{scanMessage}</Text> : null}
          {scanState !== 'idle' ? (
            <Button
              title="Scan Again"
              onPress={() => {
                setScanState('idle');
                setScanMessage('');
              }}
              variant="outline"
              fullWidth
              size="sm"
            />
          ) : null}
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default EventAttendanceScannerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  permissionCard: {
    gap: spacing.lg,
  },
  permissionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  cameraFrame: {
    flex: 1,
    minHeight: 320,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  scanBox: {
    width: 220,
    height: 220,
    borderRadius: borderRadius.lg,
    borderWidth: 3,
    borderColor: colors.textInverse,
    backgroundColor: 'transparent',
  },
  infoPanel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoTitle: {
    ...typography.h4,
    color: colors.text,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
});
