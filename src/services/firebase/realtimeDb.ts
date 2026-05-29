import { get, onValue, push, ref, set, update } from 'firebase/database';
import { rtdb } from '../../../firebase.config';
import type { BusinessConfig } from '../../types';

export const APP_CONFIG_PATH = 'appConfig/business';

export const EMPTY_BUSINESS_CONFIG: BusinessConfig = {
  businessCategories: [],
  servicesByCategory: {},
  tagsByCategory: {},
  popularTags: [],
};

type UnknownRecord = Record<string, unknown>;

function isObject(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function normalizeRecordOfStringArrays(value: unknown): Record<string, string[]> {
  if (!isObject(value)) return {};
  const result: Record<string, string[]> = {};
  Object.entries(value).forEach(([category, arr]) => {
    const cleanCategory = String(category).trim();
    if (!cleanCategory) return;
    const cleanItems = Array.from(new Set(toStringArray(arr)));
    if (cleanItems.length > 0) {
      result[cleanCategory] = cleanItems;
    }
  });
  return result;
}

export function normalizeBusinessConfig(value: unknown): BusinessConfig {
  if (!isObject(value)) return EMPTY_BUSINESS_CONFIG;
  const categories = Array.from(new Set(toStringArray(value.businessCategories)));
  const servicesByCategory = normalizeRecordOfStringArrays(value.servicesByCategory);
  const tagsByCategory = normalizeRecordOfStringArrays(value.tagsByCategory);
  const popularTags = Array.from(
    new Set([
      ...toStringArray(value.popularTags),
      ...Object.values(tagsByCategory).flat(),
    ]),
  );
  return {
    businessCategories: categories,
    servicesByCategory,
    tagsByCategory,
    popularTags,
  };
}

export function mapSnapshotToArray<T>(value: unknown, idKey: string = 'id'): T[] {
  if (!isObject(value)) return [];
  return Object.entries(value).map(([key, item]) => ({
    ...(isObject(item) ? item : {}),
    [idKey]: key,
  })) as T[];
}

export function subscribeToPath<T>(
  path: string,
  onData: (value: T) => void,
  fallback: T,
): () => void {
  const dbRef = ref(rtdb, path);
  return onValue(
    dbRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(fallback);
        return;
      }
      onData(snapshot.val() as T);
    },
    () => {
      onData(fallback);
    },
  );
}

export function subscribeToCollection<T>(
  path: string,
  onData: (items: T[]) => void,
  idKey: string = 'id',
): () => void {
  return subscribeToPath<unknown>(
    path,
    (value) => onData(mapSnapshotToArray<T>(value, idKey)),
    [] as T[],
  );
}

export async function fetchCollection<T>(path: string, idKey: string = 'id'): Promise<T[]> {
  const snapshot = await get(ref(rtdb, path));
  if (!snapshot.exists()) return [];
  return mapSnapshotToArray<T>(snapshot.val(), idKey);
}

export async function fetchRecord<T>(path: string): Promise<T | null> {
  const snapshot = await get(ref(rtdb, path));
  if (!snapshot.exists()) return null;
  return snapshot.val() as T;
}

export async function setRecord(path: string, value: unknown): Promise<void> {
  await set(ref(rtdb, path), value);
}

export async function updateRecord(path: string, value: UnknownRecord): Promise<void> {
  await update(ref(rtdb, path), value);
}

export async function createCollectionItem(path: string, value: UnknownRecord): Promise<string> {
  const itemRef = push(ref(rtdb, path));
  await set(itemRef, value);
  return itemRef.key ?? '';
}
