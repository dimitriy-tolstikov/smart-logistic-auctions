import { http, HttpResponse } from 'msw';
import type { AuctionListRequest, SetBetRequest } from './handlers.types';
import { BetRejected, mockStore } from './store';
import { notFound, scenarioResponse, validationProblem } from './problems';

const BASE = '*/api/v1';

/** Валидация тела списка по ограничениям схемы (422 ValidationProblem). */
function validateListRequest(req: AuctionListRequest) {
  const errors: Array<{ field: string; message: string; code?: string | null }> = [];
  if (req.page !== undefined && (!Number.isInteger(req.page) || req.page < 1)) {
    errors.push({ field: 'page', message: 'Значение должно быть не меньше 1.', code: 'min_value' });
  }
  if (
    req.per_page !== undefined &&
    (!Number.isInteger(req.per_page) || req.per_page < 1 || req.per_page > 100)
  ) {
    errors.push({ field: 'per_page', message: 'Значение должно быть от 1 до 100.', code: 'max_value' });
  }
  if (
    req.current_price_from != null &&
    req.current_price_to != null &&
    req.current_price_from > req.current_price_to
  ) {
    errors.push({ field: 'current_price_from', message: 'Цена «от» не может быть больше цены «до».', code: 'range' });
  }
  if (
    req.load_date_from &&
    req.load_date_to &&
    Date.parse(req.load_date_from) > Date.parse(req.load_date_to)
  ) {
    errors.push({ field: 'load_date_from', message: 'Дата «от» не может быть позже даты «до».', code: 'range' });
  }
  return errors;
}

export const handlers = [
  http.post(`${BASE}/auctions/list`, async ({ request }) => {
    const scenario = scenarioResponse();
    if (scenario) return scenario;

    let body: AuctionListRequest;
    try {
      body = (await request.json()) as AuctionListRequest;
    } catch {
      body = {};
    }
    const errors = validateListRequest(body);
    if (errors.length) return validationProblem(errors);

    return HttpResponse.json(mockStore.list(body));
  }),

  http.get(`${BASE}/auctions/:auctionUuid`, ({ params }) => {
    const scenario = scenarioResponse();
    if (scenario) return scenario;

    const data = mockStore.getShow(String(params.auctionUuid));
    if (!data) return notFound('Аукцион не найден');
    return HttpResponse.json(data);
  }),

  http.get(`${BASE}/auctions/:auctionUuid/bets`, ({ params, request }) => {
    const scenario = scenarioResponse();
    if (scenario) return scenario;

    const all = new URL(request.url).searchParams.get('all');
    const data = mockStore.listBets(String(params.auctionUuid), all === 'true');
    if (!data) return notFound('Аукцион не найден');
    return HttpResponse.json(data);
  }),

  http.post(`${BASE}/auctions/:auctionUuid/bets`, async ({ params, request }) => {
    const scenario = scenarioResponse();
    if (scenario) return scenario;

    if (!mockStore.findByUuid(String(params.auctionUuid))) {
      return notFound('Аукцион не найден');
    }
    let body: SetBetRequest;
    try {
      body = (await request.json()) as SetBetRequest;
    } catch {
      return validationProblem([{ field: 'price', message: 'Тело запроса должно быть JSON.', code: 'invalid' }]);
    }
    if (typeof body?.price !== 'number' || Number.isNaN(body.price)) {
      return validationProblem([{ field: 'price', message: 'Поле price обязательно и должно быть числом.', code: 'required' }]);
    }
    try {
      mockStore.setBet(String(params.auctionUuid), body.price);
      // По схеме 200 без тела («проксируется от upstream»).
      return new HttpResponse(null, { status: 200 });
    } catch (e) {
      if (e instanceof BetRejected) return validationProblem(e.fieldErrors);
      throw e;
    }
  }),
];
