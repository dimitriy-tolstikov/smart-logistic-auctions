import type { AuctionListRequest } from '@/entities/auction/model/types';
import { CITIES } from '@/shared/api/mocks/data/cities';
import type { AuctionsSearch } from './search-params';

/** Локальное смещение таймзоны в формате ±HH:MM (схема требует ISO со смещением). */
function tzOffset(): string {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

/** Дата из URL (yyyy-mm-dd) → ISO со смещением: «от» — начало дня, «до» — конец дня. */
export function toApiDate(date: string, boundary: 'start' | 'end'): string {
  return `${date}T${boundary === 'start' ? '00:00:00' : '23:59:59'}${tzOffset()}`;
}

const cityGcId = (name: string): number | undefined =>
  CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase())?.gc_id;

/** Search params → тело POST /auctions/list строго по AuctionListRequest. */
export function buildListRequest(s: AuctionsSearch): AuctionListRequest {
  const req: AuctionListRequest = {
    page: s.page,
    per_page: s.per_page,
  };
  if (s.cargo_num) req.cargo_num = s.cargo_num;
  if (s.status.length) req.status = [...s.status];
  if (s.statuses.length) req.statuses = [...s.statuses];
  if (s.auc_type.length) {
    // По контракту фильтр принимает только 4 типа без 'Unknown' (схема AuctionListRequest),
    // но UI позволяет искать и «Не определён» — мок осознанно принимает это расширение.
    req.auc_type = [...s.auc_type] as AuctionListRequest['auc_type'];
  }
  if (s.load_city) {
    req.load_city = s.load_city;
    const gcId = cityGcId(s.load_city);
    if (gcId !== undefined) req.load_gc_id = gcId;
  }
  if (s.unload_city) {
    req.unload_city = s.unload_city;
    const gcId = cityGcId(s.unload_city);
    if (gcId !== undefined) req.unload_gc_id = gcId;
  }
  if (s.load_date_from) req.load_date_from = toApiDate(s.load_date_from, 'start');
  if (s.load_date_to) req.load_date_to = toApiDate(s.load_date_to, 'end');
  if (s.is_available) req.is_available = true;
  if (s.is_bidder) req.is_bidder = true;
  if (s.current_price_from !== undefined) req.current_price_from = s.current_price_from;
  if (s.current_price_to !== undefined) req.current_price_to = s.current_price_to;
  return req;
}
