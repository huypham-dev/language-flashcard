import { Phrase, PhraseStatus } from '@/types';

export type StatusFilter = 'all' | PhraseStatus;

/** Lowercases and strips Vietnamese diacritics so "chuc may man" matches "Chúc may mắn". */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function filterPhrases(phrases: Phrase[], query: string, status: StatusFilter): Phrase[] {
  const q = fold(query.trim());
  return phrases.filter(
    (p) =>
      (status === 'all' || p.status === status) &&
      (q === '' || fold(p.phrase).includes(q) || fold(p.meaning).includes(q)),
  );
}

export function countByStatus(phrases: Phrase[]): Record<PhraseStatus, number> {
  let learning = 0;
  for (const p of phrases) if (p.status === 'learning') learning++;
  return { learning, mastered: phrases.length - learning };
}
