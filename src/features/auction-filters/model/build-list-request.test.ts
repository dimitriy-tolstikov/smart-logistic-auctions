import { describe, expect, it } from 'vitest';
import { buildListRequest, toApiDate } from './build-list-request';
import { parseAuctionsSearch } from './search-params';

describe('toApiDate', () => {
  const OFFSET_RE = /^2026-05-01T00:00:00[+-]\d{2}:\d{2}$/;

  it('начало/конец дня в ISO со смещением по паттерну схемы', () => {
    expect(toApiDate('2026-05-01', 'start')).toMatch(OFFSET_RE);
    expect(toApiDate('2026-05-01', 'end')).toMatch(/^2026-05-01T23:59:59[+-]\d{2}:\d{2}$/);
  });
});

describe('buildListRequest', () => {
  it('дефолтный поиск → только пагинация', () => {
    const req = buildListRequest(parseAuctionsSearch({}));
    expect(req).toEqual({ page: 1, per_page: 20 });
  });

  it('маппит все фильтры в тело AuctionListRequest', () => {
    const req = buildListRequest(
      parseAuctionsSearch({
        page: '2',
        per_page: '10',
        cargo_num: '1059',
        status: 'Leading',
        statuses: '2,5',
        auc_type: 'Down',
        load_city: 'Пермь',
        unload_city: 'Москва',
        load_date_from: '2026-05-01',
        load_date_to: '2026-05-31',
        is_available: '1',
        is_bidder: '1',
        current_price_from: '10000',
        current_price_to: '80000',
      }),
    );
    expect(req).toMatchObject({
      page: 2,
      per_page: 10,
      cargo_num: '1059',
      status: ['Leading'],
      statuses: [2, 5],
      auc_type: ['Down'],
      load_city: 'Пермь',
      load_gc_id: 59, // gc_id подставлен из мок-словаря
      unload_city: 'Москва',
      unload_gc_id: 100,
      is_available: true,
      is_bidder: true,
      current_price_from: 10000,
      current_price_to: 80000,
    });
    expect(req.load_date_from).toMatch(/^2026-05-01T00:00:00[+-]\d{2}:\d{2}$/);
    expect(req.load_date_to).toMatch(/^2026-05-31T23:59:59[+-]\d{2}:\d{2}$/);
  });

  it('неизвестный городу gc_id не подставляется', () => {
    const req = buildListRequest(parseAuctionsSearch({ load_city: 'Нарния' }));
    expect(req.load_city).toBe('Нарния');
    expect(req.load_gc_id).toBeUndefined();
  });

  it('не создаёт лишних полей при частичных фильтрах', () => {
    const req = buildListRequest(parseAuctionsSearch({ cargo_num: '1' }));
    expect(Object.keys(req).sort()).toEqual(['cargo_num', 'page', 'per_page']);
  });
});
