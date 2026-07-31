import { beforeEach, describe, expect, it } from 'vitest';
import type { AuctionListItem } from '@/entities/auction/model/types';
import { complete } from '@/shared/lib/complete';
import { BetRejected, MockAuctionsStore } from './store';

type ListItem = ReturnType<typeof complete<AuctionListItem>>;

describe('MockAuctionsStore', () => {
  let store: MockAuctionsStore;

  beforeEach(() => {
    store = new MockAuctionsStore();
  });

  const list = (req?: Parameters<MockAuctionsStore['list']>[0]) => complete(store.list(req ?? {}));
  const show = (uuid: string) => complete(store.getShow(uuid));
  const bets = (uuid: string, all?: boolean) => complete(store.listBets(uuid, all));

  it('генерирует детерминированные данные с uuid для URL', () => {
    const again = new MockAuctionsStore();
    const first = complete(store.list({ page: 1, per_page: 5 }));
    const second = complete(again.list({ page: 1, per_page: 5 }));
    expect(first.meta.total).toBeGreaterThan(30);
    expect(first.data[0]!.main.order_uid).toBe(second.data[0]!.main.order_uid);
  });

  it('пагинирует и отдаёт корректную meta', () => {
    const page1 = list({ page: 1, per_page: 20 });
    const page2 = list({ page: 2, per_page: 20 });
    expect(page1.data).toHaveLength(20);
    expect(page1.meta).toMatchObject({ current_page: 1, from: 1, to: 20, per_page: 20 });
    expect(page2.meta.current_page).toBe(2);
    const ids1 = new Set(page1.data.map((a) => a.main.id));
    expect(page2.data.every((a) => !ids1.has(a.main.id))).toBe(true);
  });

  it('фильтрует по cargo_num, статусам, типу и городам', () => {
    const all = list({ per_page: 100 });
    const sample = all.data[0]!;
    const byNum = list({ cargo_num: sample.main.cargo_num, per_page: 100 });
    expect(byNum.data.length).toBeGreaterThan(0);
    expect(byNum.data.every((a) => a.main.cargo_num.includes(sample.main.cargo_num))).toBe(true);

    const byStatus = list({ statuses: [2], per_page: 100 });
    expect(byStatus.data.every((a) => a.trading.status === 'Auction')).toBe(true);

    const byMobile = list({ status: ['Leading'], per_page: 100 });
    expect(byMobile.data.every((a) => a.trading.status_mobile === 'Leading')).toBe(true);

    const byType = list({ auc_type: ['Down'], per_page: 100 });
    expect(byType.data.every((a) => a.main.auc_type === 'Down')).toBe(true);

    const byCity = list({ load_city: 'Пермь', per_page: 100 });
    expect(byCity.data.every((a) => a.route.load.city === 'Пермь')).toBe(true);
  });

  it('фильтрует по цене и флагам is_available / is_bidder', () => {
    const byPrice = list({ current_price_from: 50000, current_price_to: 80000, per_page: 100 });
    expect(
      byPrice.data.every(
        (a) => a.trading.price !== null && a.trading.price.current >= 50000 && a.trading.price.current <= 80000,
      ),
    ).toBe(true);

    const available = list({ is_available: true, per_page: 100 });
    expect(available.data.every((a) => a.trading.is_available === true)).toBe(true);

    const bidder = list({ is_bidder: true, per_page: 100 });
    expect(bidder.data.every((a) => a.trading.is_bidder === true)).toBe(true);
  });

  it('detail содержит обязательные блоки из схемы', () => {
    const any = list({ per_page: 1 }).data[0]!;
    const detail = show(any.main.order_uid);
    expect(detail).toBeDefined();
    expect(detail).toHaveProperty('main');
    expect(detail).toHaveProperty('organizer');
    expect(detail).toHaveProperty('contacts');
    expect(detail).toHaveProperty('cargo');
    expect(detail).toHaveProperty('trading');
    expect(detail).toHaveProperty('payment');
    expect(detail).toHaveProperty('assembly');
    expect(detail).toHaveProperty('routes');
    expect(detail).toHaveProperty('admitted_organizations');
  });

  it('listBets по умолчанию скрывает отменённые, all=true возвращает все', () => {
    const all = list({ per_page: 100 });
    const withCanceled = all.data.find((a) => bets(a.main.order_uid, true)!.bets.some((b) => b.cancel_reason !== ''));
    expect(withCanceled).toBeDefined();
    const uuid = withCanceled!.main.order_uid;
    const activeOnly = bets(uuid)!;
    const withAll = bets(uuid, true)!;
    expect(activeOnly.bets.every((b) => b.cancel_reason === '')).toBe(true);
    expect(withAll.bets.length).toBeGreaterThan(activeOnly.bets.length);
  });

  it('setBet мутирует цену, статус пользователя и список ставок', () => {
    const all = list({ per_page: 100 });
    const target = all.data.find((a) => {
      if (!a.trading.can_set_bet || a.trading.price === null) return false;
      const p = show(a.main.order_uid)!.trading.price;
      return a.main.auc_type === 'Down' && p.step != null && p.min != null && p.max != null;
    });
    expect(target).toBeDefined();
    const uuid = target!.main.order_uid;
    const p = show(uuid)!.trading.price;
    const { min, step, current } = p;
    const newPrice = min! + step! * Math.floor((((current ?? min!) - min!) / step!) / 2);
    const betsBefore = bets(uuid, true)!.bets.length;

    store.setBet(uuid, newPrice);

    const after = show(uuid)!;
    expect(after.trading.price.current).toBe(newPrice);
    expect(after.trading.your.bet).toBe(true);
    expect(after.trading.your.last_bet).toBe(newPrice);
    expect(['Leading', 'Losing']).toContain(after.trading.status_mobile);

    const betsAfter = bets(uuid, true)!.bets;
    expect(betsAfter.length).toBe(betsBefore + 1);
    const mine = betsAfter.find((b) => b.organization_inn === '9616244307' && b.price_with_vat === newPrice);
    expect(mine).toBeDefined();
    expect(mine!.place).toBeGreaterThanOrEqual(1);
  });

  it('setBet отклоняет невалидные цены с ошибками по полю price', () => {
    const all = list({ per_page: 100 });
    const target = all.data.find((a) => {
      const p = show(a.main.order_uid)!.trading.price;
      return a.trading.can_set_bet && p.max != null;
    })!;
    const uuid = target.main.order_uid;
    const max = show(uuid)!.trading.price.max!;

    expect(() => store.setBet(uuid, 0)).toThrow(BetRejected);
    try {
      store.setBet(uuid, max + 10_000);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BetRejected);
      expect((e as BetRejected).fieldErrors[0]?.field).toBe('price');
    }
  });

  it('setBet на аукционе без can_set_bet отклоняется', () => {
    const all = list({ per_page: 100 });
    const closed = all.data.find((a) => !a.trading.can_set_bet)!;
    expect(closed).toBeDefined();
    expect(() => store.setBet(closed.main.order_uid, 1000)).toThrow(BetRejected);
  });
});

describe('MockAuctionsStore: сортировка и диапазоны', () => {
  let store: MockAuctionsStore;

  beforeEach(() => {
    store = new MockAuctionsStore();
  });

  const list = (req?: Parameters<MockAuctionsStore['list']>[0]) => complete(store.list(req ?? {}));

  it('sort по current_price: asc и desc, null-цены в конце', () => {
    const asc = list({ per_page: 100, sort: { current_price: 'asc' } });
    const ascPrices = asc.data.map((a) => a.trading.price?.current ?? Number.POSITIVE_INFINITY);
    expect([...ascPrices].sort((x, y) => x - y)).toEqual(ascPrices);

    const desc = list({ per_page: 100, sort: { current_price: 'desc' } });
    const descPrices = desc.data.map((a) => a.trading.price?.current ?? Number.NEGATIVE_INFINITY);
    expect([...descPrices].sort((x, y) => y - x)).toEqual(descPrices);
  });

  it('is_oldest: сортировка по дате заявки asc, по умолчанию desc', () => {
    const oldest = list({ per_page: 100, is_oldest: true });
    const ascDates = oldest.data.map((a) => Date.parse(a.main.cargo_date));
    expect([...ascDates].sort((x, y) => x - y)).toEqual(ascDates);

    const newest = list({ per_page: 100 });
    const descDates = newest.data.map((a) => Date.parse(a.main.cargo_date));
    expect([...descDates].sort((x, y) => y - x)).toEqual(descDates);
  });

  it('фильтр по дате погрузки: диапазон и пустой результат с корректной meta', () => {
    const all = list({ per_page: 100 });
    const dates = all.data.map((a) => a.route.load.date).sort();
    const from = dates[Math.floor(dates.length / 3)]!;
    const to = dates[Math.floor((dates.length / 3) * 2)]!;
    const ranged = list({ load_date_from: `${from}+03:00`, load_date_to: `${to}+03:00`, per_page: 100 });
    expect(ranged.data.length).toBeGreaterThan(0);
    for (const a of ranged.data) {
      const d = Date.parse(a.route.load.date);
      expect(d).toBeGreaterThanOrEqual(Date.parse(from));
      expect(d).toBeLessThanOrEqual(Date.parse(to));
    }

    const empty = list({ load_date_from: '2027-06-01T00:00:00+03:00' });
    expect(empty.data).toEqual([]);
    expect(empty.meta).toMatchObject({ total: 0, from: 0, to: 0, last_page: 1 });
  });
});

describe('MockAuctionsStore: направление торгов при ставке', () => {
  let store: MockAuctionsStore;

  beforeEach(() => {
    store = new MockAuctionsStore();
  });

  const list = (req?: Parameters<MockAuctionsStore['list']>[0]) => complete(store.list(req ?? {}));
  const show = (uuid: string) => complete(store.getShow(uuid));
  const bets = (uuid: string, all?: boolean) => complete(store.listBets(uuid, all));

  const findWithBounds = (pred: (item: ListItem) => boolean) =>
    list({ per_page: 100 }).data.find((a) => {
      if (!a.trading.can_set_bet || !pred(a)) return false;
      const p = show(a.main.order_uid)!.trading.price;
      return p.min != null && p.max != null && p.step != null;
    });

  it('Down: max понижается до price - step, лучшая (минимальная) ставка — place 1 и Leading', () => {
    const target = findWithBounds((a) => a.main.auc_type === 'Down');
    expect(target).toBeDefined();
    const uuid = target!.main.order_uid;
    const { min, step } = show(uuid)!.trading.price;

    store.setBet(uuid, min!); // минимально возможная — лучшая для Down

    const after = show(uuid)!;
    expect(after.trading.price.max).toBe(min! - step!);
    expect(after.trading.price.current).toBe(min!);
    expect(after.trading.price.available).toBe(min! - step!);
    expect(after.trading.status_mobile).toBe('Leading');
    const mine = bets(uuid, true)!.bets.find(
      (b) => b.organization_inn === '9616244307' && b.price_with_vat === min,
    );
    expect(mine?.place).toBe(1);
  });

  it('Up: min повышается до price + step, available пересчитывается вверх', () => {
    const target = findWithBounds((a) => {
      if (a.main.auc_type !== 'Up') return false;
      const { min, max, step, current } = show(a.main.order_uid)!.trading.price;
      if (min == null || max == null || step == null || current == null) return false;
      const candidate = min + step * (Math.floor((current + step - min) / step) + 1);
      return candidate <= max; // ставка выше текущей и в пределах max
    });
    expect(target).toBeDefined();
    const uuid = target!.main.order_uid;
    const { min, step, current } = show(uuid)!.trading.price;
    const price = min! + step! * (Math.floor((current! + step! - min!) / step!) + 1);

    store.setBet(uuid, price);

    const after = show(uuid)!;
    expect(after.trading.price.current).toBe(price);
    expect(after.trading.price.min).toBe(price + step!);
    expect(after.trading.price.available).toBe(price + step!);
    expect(after.trading.status_mobile).toBe('Leading');
  });

  it('FixPrice: текущая цена не меняется, ставка фиксируется в your', () => {
    // У FixPrice шаг ставки nullable по схеме — ищем аукцион с min/max, без требования step.
    const target = list({ per_page: 100 }).data.find((a) => {
      if (a.main.auc_type !== 'FixPrice' || !a.trading.can_set_bet) return false;
      const { min, max } = show(a.main.order_uid)!.trading.price;
      return min != null && max != null;
    });
    expect(target).toBeDefined();
    const uuid = target!.main.order_uid;
    const before = show(uuid)!;
    const price = before.trading.price.min!;

    store.setBet(uuid, price);

    const after = show(uuid)!;
    expect(after.trading.price.current).toBe(before.trading.price.current);
    expect(after.trading.your.bet).toBe(true);
    expect(after.trading.your.last_bet).toBe(price);
  });

  it('цена вне шага ставки отклоняется с кодом step', () => {
    // Down: min + step/2 улучшает текущую цену, но не лежит на сетке шага.
    const target = findWithBounds((a) => a.main.auc_type === 'Down')!;
    const uuid = target.main.order_uid;
    const { min, step } = show(uuid)!.trading.price;
    try {
      store.setBet(uuid, min! + step! / 2);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BetRejected);
      expect((e as BetRejected).fieldErrors[0]).toMatchObject({ field: 'price', code: 'step' });
    }
  });

  it('Down: ставка не ниже текущей цены отклоняется (not_improved)', () => {
    const target = findWithBounds((a) => a.main.auc_type === 'Down')!;
    const uuid = target.main.order_uid;
    const { current, step } = show(uuid)!.trading.price;
    for (const price of [current!, current! + step!]) {
      try {
        store.setBet(uuid, price);
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(BetRejected);
        expect((e as BetRejected).fieldErrors[0]).toMatchObject({ field: 'price', code: 'not_improved' });
      }
    }
  });

  it('Up: ставка не выше текущей цены отклоняется (not_improved)', () => {
    const target = findWithBounds((a) => a.main.auc_type === 'Up')!;
    const uuid = target.main.order_uid;
    const { current } = show(uuid)!.trading.price;
    try {
      store.setBet(uuid, current!);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BetRejected);
      expect((e as BetRejected).fieldErrors[0]).toMatchObject({ field: 'price', code: 'not_improved' });
    }
  });

  it('повторная ставка отменяет прежнюю активную ставку пользователя', () => {
    // Нужен запас в 2 шага вниз от текущей цены, чтобы поставить дважды.
    const target = findWithBounds((a) => {
      if (a.main.auc_type !== 'Down') return false;
      const { min, step, current } = show(a.main.order_uid)!.trading.price;
      return min != null && step != null && current != null && (current - min) / step >= 2;
    })!;
    const uuid = target.main.order_uid;
    const { current, step } = show(uuid)!.trading.price;
    const first = current! - step!;
    const second = first - step!;

    store.setBet(uuid, first);
    store.setBet(uuid, second);

    const mine = bets(uuid, true)!.bets.filter((b) => b.organization_inn === '9616244307');
    const mineActive = mine.filter((b) => b.cancel_reason === '');
    expect(mineActive).toHaveLength(1); // одна активная ставка участника
    expect(mineActive[0]!.price_with_vat).toBe(second);
    const mineCanceled = mine.filter((b) => b.cancel_reason !== '');
    expect(mineCanceled.length).toBeGreaterThan(0);
    for (const b of mineCanceled) expect(b.place).toBeNull();
    expect(show(uuid)!.trading.your.last_bet).toBe(second);
  });

  it('hide_places: места в выдаче ставок обнуляются', () => {
    const all = list({ per_page: 100 });
    const target = all.data.find(
      (a) => show(a.main.order_uid)!.trading.hide_places && bets(a.main.order_uid)!.bets.length > 0,
    );
    expect(target).toBeDefined();
    const items = bets(target!.main.order_uid)!.bets;
    expect(items.every((b) => b.place === null)).toBe(true);
  });
});
