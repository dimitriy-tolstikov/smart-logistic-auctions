import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLastListSearch, saveLastListSearch } from './last-list-search';
import { parseAuctionsSearch } from '@/features/auction-filters/model/search-params';

const mockStorage = () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
  vi.stubGlobal('sessionStorage', storage);
  return data;
};

afterEach(() => vi.unstubAllGlobals());

describe('last-list-search', () => {
  it('сохраняет и читает фильтры round-trip, дефолты срезаются', () => {
    const data = mockStorage();
    const search = parseAuctionsSearch({ page: '3', load_city: 'Пермь' });
    saveLastListSearch(search);
    expect(JSON.parse(data.get('ul-last-list-search')!)).toEqual({ page: 3, load_city: 'Пермь' });
    const restored = readLastListSearch();
    expect(restored?.page).toBe(3);
    expect(restored?.load_city).toBe('Пермь');
    // при чтении дефолты восстанавливаются
    expect(restored?.per_page).toBe(20);
  });

  it('нет записи → undefined', () => {
    mockStorage();
    expect(readLastListSearch()).toBeUndefined();
  });

  it('битый JSON или мусор в значениях → undefined/дефолты, не падает', () => {
    const data = mockStorage();
    data.set('ul-last-list-search', '{oops');
    expect(readLastListSearch()).toBeUndefined();
    data.set('ul-last-list-search', '{"page":"не число","auc_type":["WrongType"]}');
    const restored = readLastListSearch();
    expect(restored?.page).toBe(1);
    expect(restored?.auc_type).toEqual([]);
  });

  it('sessionStorage недоступен → тихий no-op', () => {
    vi.stubGlobal('sessionStorage', undefined);
    expect(() => saveLastListSearch(parseAuctionsSearch({}))).not.toThrow();
    expect(readLastListSearch()).toBeUndefined();
  });
});
