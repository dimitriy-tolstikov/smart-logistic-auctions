import createClient from 'openapi-fetch';
import type { paths } from './schema';

/**
 * Типизированный API-клиент, сгенерированный из openapi.auctions.v0.json.
 * baseUrl совпадает с `servers[0].url` схемы; в dev перехватывается MSW.
 */
// В браузере относительный путь резолвится от origin страницы;
// в Node (vitest) нужен абсолютный URL — MSW перехватывает его так же.
const baseUrl =
  typeof window === 'undefined' ? 'http://localhost/api/v1/' : '/api/v1/';

export const apiClient = createClient<paths>({
  baseUrl,
  // Не захватывать globalThis.fetch на импорте: в тестах MSW подменяет его
  // при listen(), уже после создания клиента. Резолвим на каждый вызов.
  fetch: (input: Request) => globalThis.fetch(input),
  headers: {
    'Content-Type': 'application/json',
  },
});
