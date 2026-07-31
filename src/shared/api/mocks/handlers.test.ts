import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { complete } from '@/shared/lib/complete';
import { mockServer } from './node';
import { mockStore } from './store';

const BASE = 'http://localhost/api/v1';

beforeAll(() => mockServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  mockServer.resetHandlers();
  mockStore.reset();
});
afterAll(() => mockServer.close());

const list = (req?: Parameters<typeof mockStore.list>[0]) => complete(mockStore.list(req ?? {}));
const show = (uuid: string) => complete(mockStore.getShow(uuid));
const bets = (uuid: string, all?: boolean) => complete(mockStore.listBets(uuid, all));

describe('MSW-хендлеры: контракты ответов', () => {
  it('POST /auctions/list — 200 со структурой data+meta', async () => {
    const res = await fetch(`${BASE}/auctions/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, per_page: 5 }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('data');
    expect(json).toHaveProperty('meta');
    expect(json.meta.per_page).toBe(5);
    expect(json.data[0]).toHaveProperty('main');
    expect(json.data[0]).toHaveProperty('trading');
  });

  it('POST /auctions/list — 422 ValidationProblem при per_page > 100', async () => {
    const res = await fetch(`${BASE}/auctions/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ per_page: 500 }),
    });
    expect(res.status).toBe(422);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    const json = await res.json();
    expect(json.code).toBe('validation_failed');
    expect(Array.isArray(json.errors)).toBe(true);
    expect(json.errors[0]).toMatchObject({ field: 'per_page' });
  });

  it('GET /auctions/{uuid} — 404 ProblemDetail для неизвестного uuid', async () => {
    const res = await fetch(`${BASE}/auctions/00000000-0000-4000-8000-000000000000`);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toMatchObject({ code: 'resource_not_found', title: 'Не найдено' });
    expect(json).toHaveProperty('message');
  });

  it('GET /auctions/{uuid}/bets — 200 со списком ставок', async () => {
    const any = list({ per_page: 1 }).data[0]!;
    const res = await fetch(`${BASE}/auctions/${any.main.order_uid}/bets`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('bets');
    expect(Array.isArray(json.bets)).toBe(true);
  });

  it('POST /bets — 200 без тела, состояние мутирует; 422 при невалидной цене', async () => {
    const all = list({ per_page: 100 });
    const target = all.data.find((a) => {
      const p = show(a.main.order_uid)!.trading.price;
      return a.main.auc_type === 'Down' && a.trading.can_set_bet && p.min != null && p.step != null;
    })!;
    const uuid = target.main.order_uid;
    const p = show(uuid)!.trading.price;
    const price = p.min!; // минимальная цена для Down — всегда улучшает текущую

    const ok = await fetch(`${BASE}/auctions/${uuid}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price }),
    });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('');
    expect(show(uuid)!.trading.your.last_bet).toBe(price);

    const bad = await fetch(`${BASE}/auctions/${uuid}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: -5 }),
    });
    expect(bad.status).toBe(422);
    const badJson = await bad.json();
    expect(badJson.code).toBe('validation_failed');
    expect(badJson.errors[0].field).toBe('price');
  });
});

describe('MSW-хендлеры: параметры и граничные случаи', () => {
  it('GET bets?all=true — включает отменённые, без all — нет', async () => {
    const all = list({ per_page: 100 });
    const target = all.data.find((a) =>
      bets(a.main.order_uid, true)!.bets.some((b) => b.cancel_reason !== ''),
    )!;
    const uuid = target.main.order_uid;

    const resActive = await fetch(`${BASE}/auctions/${uuid}/bets`);
    const resAll = await fetch(`${BASE}/auctions/${uuid}/bets?all=true`);
    const active = await resActive.json();
    const withAll = await resAll.json();
    expect(withAll.bets.length).toBeGreaterThan(active.bets.length);
    expect(active.bets.every((b: { cancel_reason: string }) => b.cancel_reason === '')).toBe(true);
    expect(withAll.bets.some((b: { cancel_reason: string }) => b.cancel_reason !== '')).toBe(true);
  });

  it('GET bets — 404 для неизвестного uuid', async () => {
    const res = await fetch(`${BASE}/auctions/00000000-0000-4000-8000-000000000000/bets`);
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('resource_not_found');
  });

  it('POST bets — 404 до валидации тела для неизвестного uuid', async () => {
    const res = await fetch(`${BASE}/auctions/00000000-0000-4000-8000-000000000000/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 1000 }),
    });
    expect(res.status).toBe(404);
  });

  it('POST bets — 422 при нечисловой цене и битом JSON', async () => {
    const uuid = list({ per_page: 1 }).data[0]!.main.order_uid;
    const notNumber = await fetch(`${BASE}/auctions/${uuid}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: '1000' }),
    });
    expect(notNumber.status).toBe(422);
    expect((await notNumber.json()).errors[0]).toMatchObject({ field: 'price', code: 'required' });

    const broken = await fetch(`${BASE}/auctions/${uuid}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{oops',
    });
    expect(broken.status).toBe(422);
  });

  it('POST list — битое/пустое тело трактуется как {} (200, дефолтная страница)', async () => {
    const res = await fetch(`${BASE}/auctions/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{oops',
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta.current_page).toBe(1);
  });

  it('POST list — 422 по полям page, current_price_*, load_date_*', async () => {
    const post = (body: unknown) =>
      fetch(`${BASE}/auctions/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json());

    expect((await post({ page: 0 })).errors[0]).toMatchObject({ field: 'page', code: 'min_value' });
    expect((await post({ current_price_from: 100, current_price_to: 50 })).errors[0]).toMatchObject({
      field: 'current_price_from',
    });
    expect(
      (
        await post({
          load_date_from: '2026-06-10T00:00:00+03:00',
          load_date_to: '2026-06-01T00:00:00+03:00',
        })
      ).errors[0],
    ).toMatchObject({ field: 'load_date_from' });
  });

  it('сценарии ошибок выключены в node-окружении', async () => {
    const { getScenario } = await import('./problems');
    expect(getScenario()).toBeNull();
  });
});
