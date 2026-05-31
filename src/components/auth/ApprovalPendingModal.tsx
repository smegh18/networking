import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';

export function ApprovalPendingModal({
  visible,
  onLogout,
}: {
  visible: boolean;
  onLogout: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="hourglass-outline" size={40} color={colors.warning} />
          </View>
          <Text style={styles.title}>Approval pending</Text>
          <Text style={styles.message}>
            Your registration is submitted. Please wait until an admin approves your account.
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={18} color={colors.textInverse} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    alignItems: 'center',
    ...shadows.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F59E0B15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.textInverse,
  },
});

