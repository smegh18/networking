import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { colors, typography, spacing, borderRadius, layout } from '../../theme';
import { LANGUAGES } from '../../utils/constants';
import { changeLanguage } from '../../i18n';
import type { ProfileStackParamList, Language } from '../../types';

type Props = StackScreenProps<ProfileStackParamList, 'LanguageSettings'>;

// ── Screen ─────────────────────────────────────────────────────────────────────

const LanguageSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    (i18n.language as Language) || 'en'
  );

  const handleLanguageSelect = async (langCode: Language) => {
    setSelectedLanguage(langCode);
    await changeLanguage(langCode);
  };

  return (
    <ScreenWrapper uniformLayout>
      <Header title={t('languageSettings.title')} onBack={() => navigation.goBack()} />

      <Text style={styles.subtitle}>{t('languageSettings.subtitle')}</Text>

      <Card style={styles.card} padded={false}>
        {LANGUAGES.map((lang, index) => {
          const isSelected = selectedLanguage === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageRow,
                index < LANGUAGES.length - 1 && styles.languageRowBorder,
                isSelected && styles.languageRowSelected,
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.languageInfo}>
                <Text style={[styles.languageLabel, isSelected && styles.languageLabelSelected]}>
                  {lang.label}
                </Text>
                <Text style={styles.nativeLabel}>{lang.nativeLabel}</Text>
              </View>

              <View
                style={[
                  styles.radioOuter,
                  isSelected && styles.radioOuterSelected,
                ]}
              >
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </Card>

      <Text style={styles.hint}>{t('languageSettings.hint')}</Text>
    </ScreenWrapper>
  );
};

export default LanguageSettingsScreen;

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
  },
  card: {
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  languageRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  languageRowSelected: {
    backgroundColor: colors.primaryFaded,
  },
  languageInfo: {
    flex: 1,
  },
  languageLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  languageLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  nativeLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
