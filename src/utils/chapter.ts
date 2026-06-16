import type { Chapter } from '../types';

export const DEFAULT_CHAPTER_ID = 'chapter001';
export const DEFAULT_CHAPTER_NAME = 'Ahmedabad Business Club';

export function getUserChapterId(chapterId?: string | null): string {
  const normalized = String(chapterId ?? '').trim();
  return normalized || DEFAULT_CHAPTER_ID;
}

export function getChapterName(
  chapterId: string | null | undefined,
  chapters: Chapter[],
): string {
  const normalizedChapterId = getUserChapterId(chapterId);
  return chapters.find((chapter) => chapter.id === normalizedChapterId)?.name
    || (normalizedChapterId === DEFAULT_CHAPTER_ID ? DEFAULT_CHAPTER_NAME : normalizedChapterId);
}
