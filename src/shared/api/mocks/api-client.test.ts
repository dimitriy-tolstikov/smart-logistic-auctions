import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auctionApi } from '@/entities/auction/api/auction-api';
import { mockServer } from './node';
import { mockStore } from './store';

/**
 * Сквозной тест: apiClient (openapi-fetch) → MSW-хендлеры.
 * Ловит расхождения сборки URL/тела между клиентом и моками.
 */
beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterAll(() => mockServer.close());

describe('apiClient через MSW: end-to-end', () => {
  it('list с фильтром по дате погрузки до', async () => {
    const res = await auctionApi.list({
      page: 1,
      per_page: 20,
      load_date_to: '2026-07-06T23:59:59+03:00',
    });
    expect(res.meta?.total).toBeGreaterThan(0);
  });

  it('detail → bets → setBet по uuid из списка', async () => {
    const list = await auctionApi.list({ per_page: 100 });
    const target = list.data?.find((a) => {
      const show = mockStore.getShow(a.main?.order_uid ?? '');
      return (
        a.main?.auc_type === 'Down' &&
        a.trading?.can_set_bet &&
        show?.trading?.price?.min != null &&
        show.trading.price.step != null
      );
    });
    expect(target).toBeDefined();
    const uuid = target!.main!.order_uid!;

    const detail = await auctionApi.get(uuid);
    expect(detail.main?.order_uid).toBe(uuid);

    // Минимальная цена для Down — всегда улучшает текущую.
    const price = detail.trading!.price!.min!;
    await auctionApi.setBet(uuid, price);

    const after = await auctionApi.get(uuid);
    expect(after.trading?.your?.last_bet).toBe(price);

    const bets = await auctionApi.bets(uuid, true);
    expect(bets.bets?.some((b) => b.price_with_vat === price)).toBe(true);
  });
});
