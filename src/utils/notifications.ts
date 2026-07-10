import { push, ref, set } from 'firebase/database';
import { rtdb } from '../../firebase.config';
import type { AppNotification } from '../types';

interface CreateNotificationInput {
  userId: string;
  type: AppNotification['type'];
  title: string;
  body: string;
  data?: Record<string, string>;
  createdAt?: string;
}

export async function createAppNotification({
  userId,
  type,
  title,
  body,
  data,
  createdAt,
}: CreateNotificationInput): Promise<string> {
  const notifRef = push(ref(rtdb, 'notifications'));
  await set(notifRef, {
    userId,
    type,
    title,
    body,
    data: data || {},
    read: false,
    createdAt: createdAt || new Date().toISOString(),
  });
  return notifRef.key || '';
}
