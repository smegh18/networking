import type { Chapter, Event } from '../types';

export function getEventAudienceChapterIds(event: Pick<Event, 'chapterId' | 'chapterIds'> | null | undefined): string[] {
  if (!event) return [];
  const explicitIds = Array.isArray(event.chapterIds)
    ? Array.from(new Set(event.chapterIds.map((id) => String(id || '').trim()).filter(Boolean)))
    : [];

  if (explicitIds.length > 0) {
    return explicitIds;
  }

  const legacyId = String(event.chapterId || '').trim();
  if (!legacyId || legacyId === 'all') {
    return [];
  }

  return [legacyId];
}

export function isCentralEvent(event: Pick<Event, 'chapterId' | 'chapterIds'> | null | undefined): boolean {
  if (!event) return false;
  const chapterId = String(event.chapterId || '').trim();
  return !chapterId || chapterId === 'all';
}

export function isEventVisibleToChapter(
  event: Pick<Event, 'chapterId' | 'chapterIds'> | null | undefined,
  chapterId: string | null | undefined,
): boolean {
  if (!event) return false;
  if (isCentralEvent(event)) return true;

  const normalizedChapterId = String(chapterId || '').trim();
  if (!normalizedChapterId) return false;

  return getEventAudienceChapterIds(event).includes(normalizedChapterId);
}

export function getEventAudienceLabel(
  event: Pick<Event, 'chapterId' | 'chapterIds'> | null | undefined,
  chapters: Chapter[],
): string {
  if (!event) return 'Chapter';
  if (isCentralEvent(event)) return 'Central (All Chapters)';

  const selectedChapterNames = getEventAudienceChapterIds(event)
    .map((chapterId) => chapters.find((chapter) => chapter.id === chapterId)?.name || chapterId)
    .filter(Boolean);

  if (selectedChapterNames.length === 0) return 'Chapter';
  if (selectedChapterNames.length <= 2) return selectedChapterNames.join(', ');
  return `${selectedChapterNames[0]}, ${selectedChapterNames[1]} +${selectedChapterNames.length - 2}`;
}
