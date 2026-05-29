import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '../types';

interface SettingsState {
  language: Language;
  biometricEnabled: boolean;
  pushNotificationsEnabled: boolean;
  theme: 'light' | 'dark';
}

interface SettingsActions {
  setLanguage: (language: Language) => void;
  setBiometric: (enabled: boolean) => void;
  setPushNotifications: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      language: 'en',
      biometricEnabled: false,
      pushNotificationsEnabled: true,
      theme: 'light',

      setLanguage: (language) => set({ language }),

      setBiometric: (enabled) => set({ biometricEnabled: enabled }),

      setPushNotifications: (enabled) => set({ pushNotificationsEnabled: enabled }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'netconnect-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
