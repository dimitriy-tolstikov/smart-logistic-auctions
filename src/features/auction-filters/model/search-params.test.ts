import { describe, expect, it } from 'vitest';
import { parseAuctionsSearch, stripEmptySearch } from './search-params';

describe('parseAuctionsSearch', () => {
  it('дефолты для пустых params', () => {
    const s = parseAuctionsSearch({});
    expect(s).toMatchObject({ page: 1, per_page: 20 });
    expect(s.status).toEqual([]);
    expect(s.statuses).toEqual([]);
    expect(s.auc_type).toEqual([]);
    expect(s.cargo_num).toBeUndefined();
    expect(s.is_available).toBeUndefined();
  });

  it('валидные значения парсятся', () => {
    const s = parseAuctionsSearch({
      page: '3',
      per_page: '50',
      cargo_num: '00000001059',
      status: 'Leading,Losing',
      statuses: '2,5',
      auc_type: 'Down,Up',
      load_city: 'Пермь',
      unload_city: 'Москва',
      load_date_from: '2026-05-01',
      load_date_to: '2026-05-31',
      is_available: '1',
      is_bidder: 'true',
      current_price_from: '10000',
      current_price_to: '80000',
    });
    expect(s).toMatchObject({
      page: 3,
      per_page: 50,
      cargo_num: '00000001059',
      status: ['Leading', 'Losing'],
      statuses: [2, 5],
      auc_type: ['Down', 'Up'],
      load_city: 'Пермь',
      unload_city: 'Москва',
      load_date_from: '2026-05-01',
      load_date_to: '2026-05-31',
      is_available: true,
      is_bidder: true,
      current_price_from: 10000,
      current_price_to: 80000,
    });
  });

  it('битые значения откатываются к дефолтам, parse не бросает', () => {
    const s = parseAuctionsSearch({
      page: 'abc',
      per_page: '999',
      status: 'Leading,HACKED',
      statuses: '2,99,x',
      auc_type: 'Down,Wrong',
      load_date_from: '01.05.2026',
      is_available: 'yes',
      current_price_from: '-5',
      cargo_num: '   ',
    });
    expect(s.page).toBe(1);
    expect(s.per_page).toBe(20);
    expect(s.status).toEqual(['Leading']);
    expect(s.statuses).toEqual([2]);
    expect(s.auc_type).toEqual(['Down']);
    expect(s.load_date_from).toBeUndefined();
    expect(s.is_available).toBeUndefined();
    expect(s.current_price_from).toBeUndefined();
    expect(s.cargo_num).toBeUndefined();
  });

  it('принимает JSON-массивы (формат сериализации TanStack Router)', () => {
    const s = parseAuctionsSearch({ status: ['Leading', 'Nope'], statuses: ['2', 7, 42] });
    expect(s.status).toEqual(['Leading']);
    expect(s.statuses).toEqual([2, 7]);
  });
});

describe('stripEmptySearch', () => {
  it('удаляет дефолты и пустые фильтры для чистого URL', () => {
    const stripped = stripEmptySearch(parseAuctionsSearch({}));
    expect(stripped).toEqual({});
  });

  it('оставляет значимые значения', () => {
    const stripped = stripEmptySearch(parseAuctionsSearch({ page: '2', status: 'Leading' }));
    expect(stripped).toMatchObject({ page: 2, status: ['Leading'] });
  });
});
