import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { StackScreenProps } from '@react-navigation/stack';
import { get, ref, set } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import { signInWithEmailPassword, signOut } from '../../services/firebase/auth';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, typography, spacing, layout, shadows } from '../../theme';
import { useAuthStore } from '../../stores/authStore';
import type { AuthStackParamList, User } from '../../types';

type Props = StackScreenProps<AuthStackParamList, 'AdminLogin'>;

const ADMIN_EMAIL_ALLOWLIST = ['admin@netconnect.app', 'admin@bbcn.app'];

function buildMinimalAdminUser(uid: string, email: string): Omit<User, 'uid'> & { uid: string } {
  const now = new Date().toISOString();
  const name = email === 'admin@netconnect.app' ? 'Admin' : 'Brahmin Connect Admin';
  return {
    uid,
    email: email.trim().toLowerCase(),
    name,
    phone: '',
    photoURL: '',
    businessName: 'Admin',
    businessDescription: '',
    businessCategory: '',
    businessTags: [],
    businessPhotos: [],
    socialLinks: { instagram: '', facebook: '', whatsapp: '', linkedin: '' },
    chapterId: '',
    zoneId: '',
    location: { city: '', state: '' },
    dateOfBirth: '',
    language: 'en',
    biometricEnabled: false,
    role: 'admin',
    leadershipRole: 'member',
    leadershipRolePoints: 0,
    leadershipRoleCity: '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

const AdminLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError(t('login.errorRequired', 'Email address is required'));
      return;
    }
    if (!password) {
      setError(t('auth.passwordRequired', 'Password is required'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const fbUser = await signInWithEmailPassword(trimmedEmail, password);
      const uid = fbUser.uid;
      const userRef = ref(rtdb, `users/${uid}`);
      const snap = await get(userRef);
      if (snap.exists()) {
        const data = snap.val() as Record<string, unknown>;
        const role = data?.role as string | undefined;
        if (role !== 'admin' && role !== 'superadmin') {
          await signOut();
          setError(t('auth.notAdminAccount', 'This account is not an admin. Use the regular login.'));
          return;
        }
        const user: User = { ...(data as User), uid };
        setUser(user);
        return;
      }
      if (!ADMIN_EMAIL_ALLOWLIST.includes(trimmedEmail)) {
        await signOut();
        setError(t('auth.notAdminAccount', 'This account is not an admin. Use the regular login.'));
        return;
      }
      const adminUser = buildMinimalAdminUser(uid, trimmedEmail);
      await set(userRef, adminUser);
      setUser(adminUser as User);
    } catch (err: unknown) {
      const message =
        err && typeof (err as { message?: string }).message === 'string'
          ? (err as { message: string }).message
          : t('auth.loginFailed', 'Login failed. Check email and password.');
      setError(message);
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert(t('common.error', 'Error'), message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, setUser, t]);

  return (
    <ScreenWrapper padded={false}>
      <Header
        title={t('auth.adminLogin', 'Admin Login')}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.container}>
          <Text style={styles.subtitle}>
            {t('auth.adminLoginSubtitle', 'Sign in with your admin email and password.')}
          </Text>
          <Card style={styles.card} elevated={false}>
            <TextInput
              label={t('login.emailLabel', 'Email Address')}
              placeholder="admin@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TextInput
              label={t('auth.password', 'Password')}
              placeholder={t('auth.passwordPlaceholder', 'Enter password')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              icon="lock-closed-outline"
              secureTextEntry
              editable={!isLoading}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button
              title={isLoading ? t('common.loading', 'Signing in...') : t('auth.adminLogin', 'Admin Login')}
              onPress={handleAdminLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              size="lg"
              icon="shield-checkmark-outline"
            />
          </Card>
          <Text style={styles.hint}>
            {t('auth.adminLoginHint', 'Use the admin email and password configured for this app.')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

export default AdminLoginScreen;

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  card: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
