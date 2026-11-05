export type PhraseStatus = 'learning' | 'mastered';

export interface Phrase {
  id: string;
  phrase: string;
  meaning: string;
  example?: string;
  exampleVi?: string;
  tags?: string[];
  status: PhraseStatus;
  seenCount: number;
  lastSeenAt?: string;
  createdAt: string;
}

export interface Settings {
  autoShowOnOpen: boolean;
}

export const DATA_VERSION = 1 as const;

export interface AppData {
  version: typeof DATA_VERSION;
  phrases: Phrase[];
  settings: Settings;
  /** Most recently shown ids, newest last, max RECENT_LIMIT. */
  recentIds: string[];
}

export const RECENT_LIMIT = 5;

export const DEFAULT_SETTINGS: Settings = { autoShowOnOpen: true };
