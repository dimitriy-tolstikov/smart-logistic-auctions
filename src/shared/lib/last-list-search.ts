import {
  parseAuctionsSearch,
  stripEmptySearch,
  type AuctionsSearch,
} from '@/features/auction-filters/model/search-params';

const KEY = 'ul-last-list-search';

/**
 * Последний применённый набор фильтров списка — для возврата «← К списку»
 * с детальной страницы. sessionStorage: per-tab (не утекает в соседние вкладки
 * с другими фильтрами) и переживает перезагрузку страницы в отличие от zustand.
 */
export function saveLastListSearch(search: AuctionsSearch): void {
  try {
    globalThis.sessionStorage?.setItem(KEY, JSON.stringify(stripEmptySearch(search)));
  } catch {
    // storage недоступен (приватный режим, node) — просто не запоминаем.
  }
}

/** Сохранённые фильтры или undefined (первая вкладка, битый JSON, мусор в значениях). */
export function readLastListSearch(): AuctionsSearch | undefined {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY);
    if (!raw) return undefined;
    return parseAuctionsSearch(JSON.parse(raw));
  } catch {
    return undefined;
  }
}
