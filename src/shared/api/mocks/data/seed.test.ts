import { describe, expect, it } from 'vitest';
import type { AuctionStatus, AuctionType } from '@/entities/auction/model/types';
import { complete } from '@/shared/lib/complete';
import { generateMockAuctions } from './seed';
import { CITIES } from './cities';
import { MockAuctionsStore } from '../store';

const ALL_STATUSES: AuctionStatus[] = [
  'Planning',
  'Auction',
  'DeterminateWinner',
  'WaitDeal',
  'InProgress',
  'Finished',
  'Stopped',
  'Canceled',
];
const ALL_TYPES: AuctionType[] = ['Request', 'Up', 'Down', 'FixPrice'];

describe('Генератор мок-данных (seed)', () => {
  const auctions = generateMockAuctions();

  it('детерминирован: одинаковый seed даёт одинаковые данные', () => {
    const again = generateMockAuctions();
    expect(again.length).toBe(auctions.length);
    expect(again.map((a) => a.uuid)).toEqual(auctions.map((a) => a.uuid));
    expect(again.map((a) => a.price_current)).toEqual(auctions.map((a) => a.price_current));
  });

  it('другой seed даёт другие данные', () => {
    const other = generateMockAuctions(48, 777);
    expect(other.map((a) => a.uuid)).not.toEqual(auctions.map((a) => a.uuid));
  });

  it('uuid и id уникальны, uuid — валидный v4-формат', () => {
    const uuids = new Set(auctions.map((a) => a.uuid));
    const ids = new Set(auctions.map((a) => a.id));
    expect(uuids.size).toBe(auctions.length);
    expect(ids.size).toBe(auctions.length);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    for (const a of auctions) expect(a.uuid).toMatch(uuidRe);
  });

  it('покрывает все статусы аукциона и типы торгов', () => {
    const statuses = new Set(auctions.map((a) => a.status));
    const types = new Set(auctions.map((a) => a.auc_type));
    for (const s of ALL_STATUSES) expect(statuses.has(s)).toBe(true);
    for (const t of ALL_TYPES) expect(types.has(t)).toBe(true);
  });

  it('покрывает ключевые edge-cases UI', () => {
    expect(auctions.some((a) => a.can_set_bet)).toBe(true);
    expect(auctions.some((a) => !a.can_set_bet)).toBe(true);
    expect(auctions.some((a) => a.hide_bets_history)).toBe(true);
    expect(auctions.some((a) => a.hide_points_address_and_contacts)).toBe(true);
    expect(auctions.some((a) => a.no_view_cargo_price)).toBe(true);
    expect(auctions.some((a) => a.bets.length === 0)).toBe(true);
    expect(auctions.some((a) => a.price_current === null)).toBe(true);
    expect(auctions.some((a) => a.price_step === null && a.price_current !== null)).toBe(true);
    expect(auctions.some((a) => a.cargo.car === null)).toBe(true);
    expect(auctions.some((a) => a.is_bidder)).toBe(true);
    expect(auctions.some((a) => a.cargo.is_international)).toBe(true);
    expect(auctions.some((a) => a.is_assembly)).toBe(true);
    expect(auctions.some((a) => a.contacts.length === 0)).toBe(true);
  });

  it('покрывает отменённые ставки (с причиной) и мои ставки', () => {
    const canceled = auctions.flatMap((a) => a.bets).filter((b) => b.cancel_reason !== '');
    expect(canceled.length).toBeGreaterThan(0);
    const mine = auctions.flatMap((a) => a.bets).filter((b) => b.is_mine);
    expect(mine.length).toBeGreaterThan(0);
    expect(auctions.some((a) => a.bets.some((b) => b.is_mine && b.cancel_reason !== ''))).toBe(true);
  });

  it('города маршрутов — из словаря, gc_id соответствует городу', () => {
    const byName = new Map<string, number>(CITIES.map((c) => [c.name, c.gc_id]));
    for (const a of auctions) {
      expect(byName.get(a.load.city)).toBe(a.load.city_gc_id);
      expect(byName.get(a.unload.city)).toBe(a.unload.city_gc_id);
      expect(a.load.city).not.toBe(a.unload.city);
    }
  });

  it('даты валидны и согласованы: выгрузка после погрузки, stop после start', () => {
    for (const a of auctions) {
      expect(Date.parse(a.load.date)).not.toBeNaN();
      expect(Date.parse(a.unload.date)).toBeGreaterThan(Date.parse(a.load.date));
      expect(Date.parse(a.stop_time)).toBeGreaterThan(Date.parse(a.start_time));
    }
  });

  it('цены ставок положительны, no_vat согласована со ставкой НДС', () => {
    for (const a of auctions) {
      for (const b of a.bets) {
        expect(b.price_with_vat).toBeGreaterThan(0);
        if (a.vat_rate) {
          expect(b.price_no_vat).toBeLessThan(b.price_with_vat);
        } else {
          expect(b.price_no_vat).toBe(b.price_with_vat);
        }
      }
    }
  });

  it('границы min/max выровнены по сетке шага, если шаг задан', () => {
    for (const a of auctions) {
      if (a.price_step === null || a.price_current === null) continue;
      const onGrid = (p: number) => Number.isInteger((p - a.price_current!) / a.price_step!);
      if (a.price_min !== null) expect(onGrid(a.price_min), `auction ${a.uuid} min`).toBe(true);
      if (a.price_max !== null) expect(onGrid(a.price_max), `auction ${a.uuid} max`).toBe(true);
    }
  });

  it('чужие ставки в рамках аукциона — от разных компаний (одна компания — одна ставка)', () => {
    for (const a of auctions) {
      const others = a.bets.filter((b) => !b.is_mine);
      const inns = others.map((b) => b.organization_inn);
      expect(new Set(inns).size, `auction ${a.uuid}`).toBe(inns.length);
    }
  });
});

describe('Генератор + стор: согласованность агрегатов', () => {
  const store = new MockAuctionsStore();
  const all = complete(store.list({ per_page: 100 }));

  it('каждый uuid из списка резолвится в detail', () => {
    for (const item of all.data) {
      expect(store.getShow(item.main.order_uid), item.main.order_uid).toBeDefined();
    }
  });

  it('рейтинг ставок: места идут подряд с 1, отменённые — без места', () => {
    for (const item of all.data) {
      const items = complete(store.listBets(item.main.order_uid, true))!.bets;
      const placed = items.filter((b) => b.place !== null).map((b) => b.place!);
      const sorted = [...placed].sort((x, y) => x - y);
      expect(sorted).toEqual(placed); // listBets отдаёт по месту
      expect(new Set(placed).size).toBe(placed.length); // без дублей
      if (placed.length) {
        expect(Math.min(...placed)).toBe(1);
        expect(Math.max(...placed)).toBe(placed.length);
      }
      const canceled = items.filter((b) => b.cancel_reason !== '');
      for (const b of canceled) expect(b.place).toBeNull();
    }
  });

  it('routes в detail: погрузки первыми, количество точек совпадает со списком', () => {
    for (const item of all.data) {
      const detail = complete(store.getShow(item.main.order_uid))!;
      const loadings = detail.routes.filter((r) => r.op_type === 'Loading');
      const unloadings = detail.routes.filter((r) => r.op_type === 'Unloading');
      expect(loadings.length).toBe(item.route.load.points_count);
      expect(unloadings.length).toBe(item.route.unload.points_count);
      expect(detail.routes[0]?.op_type).toBe('Loading');
      expect(detail.routes.at(-1)?.op_type).toBe('Unloading');
      detail.routes.forEach((r, idx) => expect(r.row_num).toBe(idx + 1));
    }
  });

  it('your-флаги согласованы со ставками', () => {
    for (const item of all.data) {
      const items = complete(store.listBets(item.main.order_uid, true))!.bets;
      const hasMineActive = items.some((b) => b.organization_inn === '9616244307' && b.cancel_reason === '');
      if (hasMineActive) {
        expect(item.trading.your?.bet).toBe(true);
        expect(item.trading.your?.last_bet).not.toBeNull();
      }
    }
  });

  it('скрытие контактов и адресов: флаг обнуляет контакты и адреса в detail', () => {
    const hidden = all.data
      .map((i) => complete(store.getShow(i.main.order_uid))!)
      .filter((s) => s.trading.hide_points_address_and_contacts);
    expect(hidden.length).toBeGreaterThan(0);
    for (const s of hidden) {
      expect(s.contacts).toEqual([]);
      for (const r of s.routes) {
        expect(r.location.loading_address).toBe('');
        expect(r.contact.phone).toBe('');
      }
    }
  });

  it('no_view_cargo_price: цена груза обнуляется в detail', () => {
    const hidden = all.data
      .map((i) => complete(store.getShow(i.main.order_uid))!)
      .filter((s) => s.trading.no_view_cargo_price);
    expect(hidden.length).toBeGreaterThan(0);
    for (const s of hidden) expect(s.cargo.price).toBe('0');
  });
});

describe('Связность статусов мок-данных', () => {
  const store = new MockAuctionsStore();
  const auctions = generateMockAuctions();

  /** Допустимые торговые статусы пользователя для каждого статуса аукциона. */
  const ALLOWED: Record<string, string[]> = {
    Planning: ['NotParticipating'],
    Auction: ['NotParticipating', 'Leading', 'Losing'],
    DeterminateWinner: ['NotParticipating', 'Leading', 'Losing'],
    WaitDeal: ['NotParticipating', 'Winner', 'Losing'],
    InProgress: ['NotParticipating', 'Confirmed', 'Losing'],
    Finished: ['NotParticipating', 'Winner', 'Confirmed', 'Losing'],
    Stopped: ['NotParticipating', 'Losing'],
    Canceled: ['NotParticipating', 'Losing'],
    Unknown: ['NotParticipating'],
  };

  it('торговый статус пользователя соответствует статусу аукциона', () => {
    for (const a of auctions) {
      expect(
        ALLOWED[a.status] ?? [],
        `${a.status} + ${a.status_mobile}`,
      ).toContain(a.status_mobile);
    }
  });

  it('Planning: ставок нет и участия нет', () => {
    const planning = auctions.filter((a) => a.status === 'Planning');
    expect(planning.length).toBeGreaterThan(0);
    for (const a of planning) {
      expect(a.bets).toEqual([]);
      expect(a.status_mobile).toBe('NotParticipating');
      expect(a.is_bidder).toBe(false);
      expect(a.can_set_bet).toBe(false);
    }
  });

  it('is_bidder эквивалентен участию (status_mobile !== NotParticipating)', () => {
    for (const a of auctions) {
      expect(a.is_bidder).toBe(a.status_mobile !== 'NotParticipating');
    }
  });

  it('побеждающие статусы (Leading/Winner/Confirmed): моя ставка активна и имеет place 1', () => {
    const all = complete(store.list({ per_page: 100 }));
    const winners = all.data.filter(
      (a) =>
        ['Leading', 'Winner', 'Confirmed'].includes(a.trading.status_mobile) &&
        // hide_places обнуляет place в выдаче по контракту — проверять нечего.
        !complete(store.getShow(a.main.order_uid))!.trading.hide_places,
    );
    expect(winners.length).toBeGreaterThan(0);
    for (const item of winners) {
      const items = complete(store.listBets(item.main.order_uid))!.bets;
      const mine = items.find((b) => b.organization_inn === '9616244307');
      expect(mine, `${item.trading.status}/${item.trading.status_mobile}`).toBeDefined();
      expect(mine!.place, `${item.trading.status}/${item.trading.status_mobile}`).toBe(1);
      expect(item.trading.your?.bet).toBe(true);
    }
  });

  it('Losing: моя ставка есть, но она не лучшая (или отменена)', () => {
    const all = complete(store.list({ per_page: 100 }));
    const losing = all.data.filter(
      (a) =>
        a.trading.status_mobile === 'Losing' &&
        !complete(store.getShow(a.main.order_uid))!.trading.hide_places,
    );
    expect(losing.length).toBeGreaterThan(0);
    for (const item of losing) {
      const items = complete(store.listBets(item.main.order_uid, true))!.bets;
      const mine = items.find((b) => b.organization_inn === '9616244307');
      expect(mine).toBeDefined();
      if (mine!.cancel_reason === '') {
        expect(mine!.place).not.toBe(1);
      }
    }
  });

  it('отменённой моя ставка бывает только при Losing', () => {
    for (const a of auctions) {
      const mineCanceled = a.bets.some((b) => b.is_mine && b.cancel_reason !== '');
      if (mineCanceled) {
        expect(a.status_mobile).toBe('Losing');
        expect(a.your_bet).toBe(false); // активной ставки нет
      }
    }
  });

  it('победитель ставки (is_win) — только у WaitDeal/Finished', () => {
    for (const a of auctions) {
      for (const b of a.bets) {
        if (b.is_win) {
          expect(['WaitDeal', 'Finished']).toContain(a.status);
          expect(b.place).toBe(1);
        }
      }
    }
  });

  it('can_set_bet — только у идущих торгов', () => {
    for (const a of auctions) {
      if (a.can_set_bet) expect(a.status).toBe('Auction');
    }
  });

  it('у идущих торгов без can_set_bet есть объяснимая причина', () => {
    const blocked = auctions.filter((a) => a.status === 'Auction' && !a.can_set_bet);
    expect(blocked.length).toBeGreaterThan(0);
    for (const a of blocked) {
      const reason = !a.is_accredited ? 'нет аккредитации' : a.admitted_organizations.length === 0 ? 'нет допуска' : null;
      expect(reason, `Auction ${a.uuid}: can_set_bet=false без причины`).not.toBeNull();
    }
  });

  it('допуск согласован со списком admitted_organizations', () => {
    for (const a of auctions) {
      if (a.can_set_bet) {
        expect(a.admitted_organizations.some((o) => o.inn === '9616244307')).toBe(true);
      }
    }
  });

  it('текущая цена равна лучшей активной ставке рынка (если ставки есть)', () => {
    const all = complete(store.list({ per_page: 100 }));
    for (const item of all.data) {
      const items = complete(store.listBets(item.main.order_uid))!.bets;
      if (!items.length || item.trading.price === null) continue;
      const best = items[0]!.price_with_vat;
      expect(item.trading.price.current, item.main.order_uid).toBe(best);
    }
  });
});
