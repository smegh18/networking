import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { BusinessConfig, User } from '../types';
import {
  APP_CONFIG_PATH,
  EMPTY_BUSINESS_CONFIG,
  normalizeBusinessConfig,
  subscribeToCollection,
  subscribeToPath,
} from '../services/firebase/realtimeDb';

export function useRealtimeCollection<T>(path: string, idKey: string = 'id') {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToCollection<T>(
      path,
      (nextItems) => {
        setItems(nextItems);
        setLoading(false);
      },
      idKey,
    );
    return unsubscribe;
  }, [path, idKey]);

  return { items, loading };
}

export function useRealtimeRecord<T>(path: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPath<T>(
      path,
      (nextValue) => {
        setValue(nextValue);
        setLoading(false);
      },
      fallback,
    );
    return unsubscribe;
  }, [fallback, path]);

  return { value, loading };
}

export function useBusinessConfig() {
  const { value, loading } = useRealtimeRecord<unknown>(APP_CONFIG_PATH, EMPTY_BUSINESS_CONFIG);
  const { items: users } = useRealtimeCollection<User>('users', 'uid');
  const config = useMemo(() => {
    const normalized = normalizeBusinessConfig(value);
    if (
      normalized.businessCategories.length > 0
      || normalized.popularTags.length > 0
      || Object.keys(normalized.servicesByCategory).length > 0
      || Object.keys(normalized.tagsByCategory || {}).length > 0
    ) {
      return normalized;
    }

    const categories = Array.from(
      new Set(users.map((user) => (user.businessCategory || '').trim()).filter(Boolean)),
    );
    const popularTags = Array.from(
      new Set(users.flatMap((user) => user.businessTags || []).map((tag) => tag.trim()).filter(Boolean)),
    );
    const servicesByCategory: Record<string, string[]> = {};
    const tagsByCategory: Record<string, string[]> = {};
    users.forEach((user) => {
      const category = (user.businessCategory || '').trim();
      if (!category) return;
      const existingServices = servicesByCategory[category] || [];
      servicesByCategory[category] = Array.from(new Set([...existingServices, ...(user.services || [])]));
      const existingTags = tagsByCategory[category] || [];
      tagsByCategory[category] = Array.from(new Set([...existingTags, ...(user.businessTags || [])]));
    });
    return {
      businessCategories: categories,
      popularTags,
      servicesByCategory,
      tagsByCategory,
    } as BusinessConfig;
  }, [users, value]);
  return { config, loading };
}

export function useCurrentUserRealtime() {
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authUser?.uid) return;
    setLoading(true);
    const unsubscribe = subscribeToPath<unknown>(
      `users/${authUser.uid}`,
      (rawUser) => {
        const user = rawUser && typeof rawUser === 'object'
          ? ({ ...(rawUser as Record<string, unknown>), uid: authUser.uid } as User)
          : null;
        if (user) {
          setUser(user);
        }
        setLoading(false);
      },
      null,
    );
    return unsubscribe;
  }, [authUser?.uid, setUser]);

  return { loading };
}
