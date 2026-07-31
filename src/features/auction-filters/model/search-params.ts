import { z } from 'zod';

/** Допустимые значения фильтров (подмножества enum'ов схемы для UI). */
export const FILTER_AUCTION_STATUSES = [
  'Planning',
  'Auction',
  'DeterminateWinner',
  'WaitDeal',
  'InProgress',
  'Finished',
  'Stopped',
  'Canceled',
] as const;
export const FILTER_TRADING_STATUSES = [
  'NotParticipating',
  'Leading',
  'Losing',
  'Winner',
  'Confirmed',
] as const;
export const FILTER_AUC_TYPES = ['Request', 'Up', 'Down', 'FixPrice', 'Unknown'] as const;

export const PER_PAGE_OPTIONS = [10, 20, 50] as const;

/** Код статуса аукциона для числового фильтра statuses (1–8 по схеме). */
export const AUCTION_STATUS_CODE: Record<(typeof FILTER_AUCTION_STATUSES)[number], number> = {
  Planning: 1,
  Auction: 2,
  DeterminateWinner: 3,
  WaitDeal: 4,
  InProgress: 5,
  Finished: 6,
  Stopped: 7,
  Canceled: 8,
};

const strParam = z.string().trim().min(1).optional().catch(undefined);

const dateParam = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

const numParam = z.coerce.number().nonnegative().optional().catch(undefined);

const boolParam = z
  .union([z.literal('1'), z.literal('true'), z.boolean()])
  .optional()
  .catch(undefined)
  .transform((v) => (v === '1' || v === 'true' || v === true ? true : undefined));

/** CSV или JSON-массив из URL → массив валидных enum-значений (невалидные отбрасываются). */
const enumArrayParam = <T extends string>(allowed: readonly T[]) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v): T[] => {
      const parts = Array.isArray(v) ? v : v ? v.split(',') : [];
      return parts.filter((p): p is T => (allowed as readonly string[]).includes(p));
    });

/** Коды статусов 1–8; мусор отбрасывается. */
const statusCodesParam = z
  .union([z.string(), z.array(z.union([z.string(), z.number()]))])
  .optional()
  .transform((v): number[] => {
    const parts = Array.isArray(v) ? v : v ? v.split(',') : [];
    return parts.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 8);
  });

export const auctionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  per_page: z
    .coerce.number()
    .int()
    .refine((v) => (PER_PAGE_OPTIONS as readonly number[]).includes(v))
    .catch(20),
  cargo_num: strParam,
  status: enumArrayParam(FILTER_TRADING_STATUSES),
  statuses: statusCodesParam,
  auc_type: enumArrayParam(FILTER_AUC_TYPES),
  load_city: strParam,
  unload_city: strParam,
  load_date_from: dateParam,
  load_date_to: dateParam,
  is_available: boolParam,
  is_bidder: boolParam,
  current_price_from: numParam,
  current_price_to: numParam,
});

export type AuctionsSearch = z.infer<typeof auctionsSearchSchema>;

/**
 * Парсинг search params с безопасными fallback'ами:
 * любое битое значение откатывается к дефолту, parse не бросает.
 */
export function parseAuctionsSearch(search: Record<string, unknown>): AuctionsSearch {
  return auctionsSearchSchema.parse(search);
}

/** Убирает дефолтные/пустые значения, чтобы URL оставался чистым. */
export function stripEmptySearch(s: AuctionsSearch): Partial<AuctionsSearch> {
  const out: Partial<AuctionsSearch> = { ...s };
  if (out.page === 1) delete out.page;
  if (out.per_page === 20) delete out.per_page;
  if (!out.status?.length) delete out.status;
  if (!out.statuses?.length) delete out.statuses;
  if (!out.auc_type?.length) delete out.auc_type;
  for (const key of [
    'cargo_num',
    'load_city',
    'unload_city',
    'load_date_from',
    'load_date_to',
    'is_available',
    'is_bidder',
    'current_price_from',
    'current_price_to',
  ] as const) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

/**
 * TanStack Router требует полный тип search при навигации.
 * Runtime безопасен: отсутствующие ключи парсятся validateSearch в дефолты.
 */
export const toRouterSearch = (s: Partial<AuctionsSearch>): AuctionsSearch => s as AuctionsSearch;
