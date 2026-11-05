import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CORRUPT_PREFIX,
  STORAGE_KEY,
  ValidationError,
  addPhrase,
  createSeedData,
  deletePhrase,
  importPhrases,
  loadData,
  migrate,
  resetToSeed,
  saveData,
  setStatus,
  updatePhrase,
  updateSettings,
} from '@/store/phrases';
import { AppData } from '@/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = '2026-11-05T00:00:00.000Z';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('loadData', () => {
  it('seeds and persists on first run', async () => {
    const { data, recoveredFromCorrupt } = await loadData(NOW);
    expect(recoveredFromCorrupt).toBe(false);
    expect(data.phrases).toHaveLength(50);
    expect(data.phrases.every((p) => p.status === 'learning' && p.seenCount === 0)).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!)).toEqual(data);
  });

  it('reads back what was saved', async () => {
    const data = setStatus(createSeedData(NOW), 'p001', 'mastered');
    await saveData(data);
    const loaded = await loadData(NOW);
    expect(loaded.data).toEqual(data);
  });

  it('backs up corrupt JSON and falls back to seed', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{broken');
    const { data, recoveredFromCorrupt } = await loadData(NOW);
    expect(recoveredFromCorrupt).toBe(true);
    expect(data.phrases).toHaveLength(50);
    expect(await AsyncStorage.getItem(`${CORRUPT_PREFIX}${Date.parse(NOW)}`)).toBe('{broken');
  });
});

describe('migrate', () => {
  it('keeps valid version-1 data intact', () => {
    const data = createSeedData(NOW);
    expect(migrate(JSON.parse(JSON.stringify(data)), NOW)).toEqual(data);
  });

  it('repairs settings and drops unknown recent ids', () => {
    const out = migrate({ version: 1, phrases: [{ id: 'a', phrase: 'x', meaning: 'y' }], recentIds: ['a', 'zz', 3] }, NOW);
    expect(out.settings).toEqual({ autoShowOnOpen: true });
    expect(out.recentIds).toEqual(['a']);
  });

  it.each([[null], [[]], [{ version: 99, phrases: [] }], [{ version: 1 }]])('throws on %p', (raw) => {
    expect(() => migrate(raw, NOW)).toThrow();
  });
});

describe('pure operations', () => {
  const base = (): AppData => ({ ...createSeedData(NOW), recentIds: ['p001'] });

  it('addPhrase appends a normalized phrase', () => {
    const { data, phrase } = addPhrase(base(), { phrase: ' New ', meaning: 'Mới', tags: ['a'] }, NOW);
    expect(data.phrases).toHaveLength(51);
    expect(phrase).toMatchObject({ phrase: 'New', meaning: 'Mới', status: 'learning', seenCount: 0, tags: ['a'] });
  });

  it('addPhrase rejects missing required fields', () => {
    expect(() => addPhrase(base(), { phrase: '', meaning: 'x' }, NOW)).toThrow(ValidationError);
  });

  it('updatePhrase keeps progress, replaces content and clears removed optionals', () => {
    let data = setStatus(base(), 'p001', 'mastered');
    data = updatePhrase(data, 'p001', { phrase: 'Edited', meaning: 'M' }, NOW);
    const p = data.phrases.find((x) => x.id === 'p001')!;
    expect(p).toMatchObject({ phrase: 'Edited', meaning: 'M', status: 'mastered' });
    expect(p.example).toBeUndefined();
    expect(p.tags).toBeUndefined();
  });

  it('updatePhrase throws for unknown id', () => {
    expect(() => updatePhrase(base(), 'nope', { phrase: 'a', meaning: 'b' })).toThrow(ValidationError);
  });

  it('deletePhrase removes phrase and its recent entry', () => {
    const data = deletePhrase(base(), 'p001');
    expect(data.phrases.find((p) => p.id === 'p001')).toBeUndefined();
    expect(data.recentIds).toEqual([]);
  });

  it('updateSettings merges settings', () => {
    expect(updateSettings(base(), { autoShowOnOpen: false }).settings.autoShowOnOpen).toBe(false);
  });

  it('resetToSeed keeps settings', () => {
    const data = updateSettings(deletePhrase(base(), 'p002'), { autoShowOnOpen: false });
    const out = resetToSeed(data, NOW);
    expect(out.phrases).toHaveLength(50);
    expect(out.settings.autoShowOnOpen).toBe(false);
  });

  it('importPhrases replace drops recent ids that no longer exist', () => {
    const incoming = [{ id: 'z', phrase: 'z', meaning: 'z', status: 'learning' as const, seenCount: 0, createdAt: NOW }];
    const out = importPhrases(base(), incoming, 'replace');
    expect(out.phrases.map((p) => p.id)).toEqual(['z']);
    expect(out.recentIds).toEqual([]);
  });
});
