import type { AuctionStatus, AuctionType } from '@/entities/auction/model/types';
import { CITIES } from './cities';
import type { MockAuction, MockBet, MobileTradingStatus } from '../model';

/** Текущий пользователь мока: его организация и контакт. */
export const CURRENT_USER = {
  subscriber_id: 13,
  organization_id: 14,
  organization_inn: '9616244307',
  organization_name: 'ООО «ТестПеревоз»',
  contact_name: 'Иванов Иван',
  contact_phone: '+79001234567',
} as const;

const AUC_TYPES: AuctionType[] = ['Request', 'Up', 'Down', 'FixPrice'];
const STATUSES: AuctionStatus[] = [
  'Planning',
  'Auction',
  'Auction', // торги идут — самый частый кейс, даём два слота
  'DeterminateWinner',
  'WaitDeal',
  'InProgress',
  'Finished',
  'Stopped',
  'Canceled',
];
const CARGO_NAMES = [
  'Мороженое',
  'Металлопрокат',
  'Кирпич',
  'Зерно',
  'Товары народного потребления',
  'Пиломатериалы',
  'Оборудование',
  'Продукты питания',
];
const BODY_TYPES = ['тентованный', 'фургон', 'рефрижератор', 'бортовой', 'контейнеровоз'];
const ORGANIZATIONS = [
  { name: 'ООО «ЛИМ»', inn: '7703769184', kpp: '770301001' },
  { name: 'АО «Синара-Транс»', inn: '6671285411', kpp: '667101001' },
  { name: 'ООО «Деловые Линии»', inn: '7842100230', kpp: '784201001' },
  { name: 'ООО «Черкизово»', inn: '5036044520', kpp: '503601001' },
  { name: 'ИП Сидоров А.П.', inn: '590412345678', kpp: '' },
];
const CARRIERS = [
  { id: 101, name: 'ООО «Перевозчик»', inn: '7712345678' },
  { id: 102, name: 'ООО «ТрансЛайн»', inn: '5902111222' },
  { id: 103, name: 'АО «ГрузАвто»', inn: '6670333444' },
  { id: 104, name: 'ИП Кузнецов В.И.', inn: '590455566677' },
];

/** Детерминированный PRNG, чтобы данные были стабильны между перезапусками. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;
const int = (rng: Rng, from: number, to: number) => from + Math.floor(rng() * (to - from + 1));

/** Детерминированная тасовка Фишера–Йетса (исходный массив не мутируется). */
const shuffled = <T>(rng: Rng, arr: readonly T[]): T[] => {
  const copy = arr.slice();
  for (let k = copy.length - 1; k > 0; k -= 1) {
    const j = Math.floor(rng() * (k + 1));
    [copy[k], copy[j]] = [copy[j]!, copy[k]!];
  }
  return copy;
};

/** ISO без смещения — как в примерах схемы ('2026-05-26T09:00:00'). */
const iso = (d: Date): string => d.toISOString().slice(0, 19);
const addHours = (d: Date, h: number): Date => new Date(d.getTime() + h * 3_600_000);

const round2 = (n: number): number => Math.round(n * 100) / 100;
const noVat = (withVat: number, vatRate: number | null): number =>
  vatRate ? round2(withVat / (1 + vatRate / 100)) : withVat;

function uuid(rng: Rng, index: number): string {
  const head = index.toString(16).padStart(8, '0');
  const part = (len: number) =>
    Array.from({ length: len }, () => Math.floor(rng() * 16).toString(16)).join('');
  return `${head}-${part(4)}-4${part(3)}-${pick(rng, ['8', '9', 'a', 'b'])}${part(3)}-${part(12)}`;
}

function buildBet(rng: Rng, betId: number, opts: {
  price: number;
  vatRate: number | null;
  isMine: boolean;
  /** Перевозчик для чужой ставки; null — ставка текущего пользователя. */
  carrier: (typeof CARRIERS)[number] | null;
  createdAt: Date;
  canceled: boolean;
  isCounter?: boolean;
}): MockBet {
  const carrier = opts.isMine ? null : opts.carrier!;
  return {
    id: betId,
    created_at: iso(opts.createdAt),
    subscriber_id: opts.isMine ? CURRENT_USER.subscriber_id : int(rng, 100, 999),
    contact_name: opts.isMine ? CURRENT_USER.contact_name : `Петров Пётр ${betId}`,
    contact_phone: opts.isMine ? CURRENT_USER.contact_phone : `+7900${String(int(rng, 1000000, 9999999))}`,
    price_with_vat: opts.price,
    price_no_vat: noVat(opts.price, opts.vatRate),
    organization_id: opts.isMine ? CURRENT_USER.organization_id : carrier!.id,
    organization_inn: opts.isMine ? CURRENT_USER.organization_inn : carrier!.inn,
    organization_name: opts.isMine ? CURRENT_USER.organization_name : carrier!.name,
    transporter_comment: rng() < 0.2 ? 'Готовы загрузиться в любое время' : null,
    is_rejected: false,
    is_counter: opts.isCounter ?? false,
    is_win: false,
    run_number: 0,
    cancel_reason: opts.canceled ? pick(rng, ['Отменена перевозчиком', 'Дублирующая ставка', 'Изменились условия']) : '',
    place: null, // пересчитывается стором
    payment_type: 'Безналичная с НДС',
    vat_rate: opts.vatRate ? String(opts.vatRate) : null,
    is_mine: opts.isMine,
  };
}

/**
 * Связность статусов: торговый статус пользователя выводится из статуса аукциона.
 * - Planning/Unknown — участия нет
 * - Auction/DeterminateWinner — победителя ещё нет: Leading/Losing
 * - WaitDeal — победитель определён: Winner/Losing
 * - InProgress — сделка в работе: Confirmed/Losing
 * - Finished — Winner/Confirmed/Losing
 * - Stopped/Canceled — победителя быть не может: Losing
 */
function deriveStatusMobile(rng: Rng, status: AuctionStatus, participates: boolean): MobileTradingStatus {
  if (!participates) return 'NotParticipating';
  switch (status) {
    case 'Auction':
    case 'DeterminateWinner':
      return pick(rng, ['Leading', 'Losing'] as const);
    case 'WaitDeal':
      return pick(rng, ['Winner', 'Losing'] as const);
    case 'InProgress':
      return pick(rng, ['Confirmed', 'Losing'] as const);
    case 'Finished':
      return pick(rng, ['Winner', 'Confirmed', 'Losing'] as const);
    case 'Stopped':
    case 'Canceled':
      return 'Losing';
    default:
      return 'NotParticipating';
  }
}

function buildAuction(rng: Rng, i: number): MockAuction {
  const status = STATUSES[i % STATUSES.length]!;
  const aucType = i % 11 === 10 ? 'Unknown' : AUC_TYPES[i % AUC_TYPES.length]!;
  const loadCity = CITIES[i % CITIES.length]!;
  const unloadCity = CITIES[(i + int(rng, 1, CITIES.length - 1)) % CITIES.length]!;
  const org = ORGANIZATIONS[i % ORGANIZATIONS.length]!;
  const vatRate = i % 4 === 3 ? null : 20;

  // Даты: фиксированная база для детерминизма.
  const base = new Date(Date.UTC(2026, 5, 1, 6, 0, 0));
  const startTime = addHours(base, int(rng, -72, 72));
  const stopTime = addHours(startTime, int(rng, 6, 96));
  const loadDate = addHours(startTime, int(rng, 24, 120));
  const unloadDate = addHours(loadDate, int(rng, 12, 96));

  // Участие невозможно до начала торгов и при неизвестном статусе.
  const participates = i % 3 !== 0 && status !== 'Planning' && status !== 'Unknown';
  // Отменённой моя ставка может быть только в проигрышном состоянии.
  const mineCanceled = participates && i % 9 === 4;
  const statusMobile = mineCanceled ? 'Losing' : deriveStatusMobile(rng, status, participates);
  const isBidder = statusMobile !== 'NotParticipating';
  const isAccredited = i % 6 !== 1;
  // Часть аукционов — организация пользователя не допущена к торгам.
  const isAdmitted = i % 5 !== 1;
  // Ставить можно только на идущих торгах, при аккредитации и допуске.
  const canSetBet = status === 'Auction' && isAccredited && isAdmitted;

  const hasPrice = status !== 'Planning' || i % 4 === 0;
  const distance = int(rng, 150, 2800);
  const priceStart = hasPrice ? int(rng, 15, 120) * 1000 : null;
  const step = priceStart !== null && i % 8 !== 7 ? int(rng, 1, 10) * 500 : null;
  const priceCurrent =
    priceStart !== null && status !== 'Planning'
      ? aucType === 'Up'
        ? priceStart + (step ?? 500) * int(rng, 0, 6)
        : aucType === 'Down'
          ? Math.max(priceStart - (step ?? 500) * int(rng, 0, 6), 1000)
          : priceStart
      : priceStart;

  const hasBounds = i % 6 !== 1 && priceCurrent !== null;
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  if (hasBounds && priceCurrent !== null) {
    if (step !== null) {
      // Границы выравнены по сетке шага (current ± k·step), иначе «доступная
      // ставка» (current ± step) не проходила бы проверку кратности от min.
      const maxStepsDown = Math.floor((priceCurrent - step) / step);
      priceMin = maxStepsDown >= 1 ? priceCurrent - step * int(rng, 1, maxStepsDown) : null;
      priceMax = priceCurrent + step * int(rng, 2, 8);
    } else {
      priceMin = Math.max(priceCurrent * 0.6, 1000);
      priceMax = priceCurrent * 1.2;
    }
  }

  // «Побеждающий» торговый статус означает: моя ставка — лучшая (place 1).
  const mineWins = statusMobile === 'Leading' || statusMobile === 'Winner' || statusMobile === 'Confirmed';

  const bets: MockBet[] = [];
  // Planning — торги не начались, ставок нет; часть остальных — пустые (empty state).
  let othersCount = status === 'Planning' ? 0 : i % 6 === 2 ? 0 : int(rng, 0, 5);
  // При Losing на рынке обязана быть ставка лучше моей — она и есть текущая цена.
  if (isBidder && !mineWins && othersCount === 0) othersCount = 1;
  // Одна компания — одна ставка в аукционе: перевозчиков раздаём без повторов.
  othersCount = Math.min(othersCount, CARRIERS.length);
  const carriers = shuffled(rng, CARRIERS);
  let betId = i * 100 + 1;
  for (let b = 0; b < othersCount; b += 1) {
    const offset = (step ?? 500) * int(rng, 1, 4);
    // Текущая цена — лучшая активная ставка рынка. Если лучшая — моя,
    // чужие ставки строго хуже; иначе первая чужая задаёт текущую цену.
    const betPrice =
      priceCurrent === null
        ? int(rng, 15, 100) * 1000
        : aucType === 'FixPrice'
          ? priceCurrent
          : aucType === 'Up'
            ? mineWins || b > 0
              ? priceCurrent - offset
              : priceCurrent
            : mineWins || b > 0
              ? priceCurrent + offset
              : priceCurrent;
    bets.push(
      buildBet(rng, betId++, {
        price: round2(betPrice),
        vatRate,
        isMine: false,
        carrier: carriers[b]!,
        createdAt: addHours(startTime, b + 1),
        // Отменяемая чужая ставка никогда не задаёт текущую цену рынка:
        // при побеждающей моей — отменяем первую (она хуже), иначе — третью.
        canceled: i % 4 === 1 && (mineWins ? b === 0 : b === 2),
        isCounter: b === 1 && i % 5 === 2,
      }),
    );
  }

  let yourLastBet: number | null = null;
  if (isBidder) {
    const offset = step ?? 500;
    yourLastBet =
      priceCurrent === null
        ? int(rng, 15, 100) * 1000
        : aucType === 'FixPrice'
          ? priceCurrent
          : mineWins
            ? priceCurrent // моя ставка и есть лучшая текущая цена
            : round2(aucType === 'Up' ? priceCurrent - offset : priceCurrent + offset); // перебита
    bets.push(
      buildBet(rng, betId, {
        price: yourLastBet,
        vatRate,
        isMine: true,
        carrier: null,
        // При равной лучшей цене place 1 — у более ранней ставки:
        // побеждающая моя создана первой, проигрывающая — после рыночных.
        createdAt: addHours(startTime, mineWins ? 0 : othersCount + 1),
        canceled: mineCanceled,
      }),
    );
  }

  const weight = int(rng, 1, 20);
  const volume = int(rng, 10, 82);
  const bodyType = pick(rng, BODY_TYPES);

  return {
    id: 1200 + i,
    uuid: uuid(rng, i + 1),
    cargo_num: String(10000000000 + i * 37).slice(-11),
    cargo_date: iso(addHours(base, int(rng, -96, 0))),
    created_at: iso(addHours(base, int(rng, -120, -24))),
    priority_sort: 0,
    is_assembly: i % 10 === 7,
    auc_type: aucType,
    status,
    status_mobile: statusMobile,
    start_time: iso(startTime),
    stop_time: iso(stopTime),
    bid_measurement_type: i % 7 === 3 ? 'PerKm' : i % 9 === 8 ? null : 'PerRoute',
    can_set_bet: canSetBet,
    allow_counter_bets: i % 3 !== 0,
    hide_bets_history: i % 7 === 0,
    hide_places: i % 8 === 3,
    no_view_cargo_price: i % 6 === 0,
    hide_points_address_and_contacts: i % 5 === 0,
    direction: i % 4 === 0 ? `${loadCity.name} — ${unloadCity.name}` : null,
    comment: i % 3 === 0 ? 'Требуется опыт перевозки данного типа груза' : null,
    is_bidder: isBidder,
    is_available: canSetBet, // по схеме: «доступные для ставки аукционы»
    is_accredited: isAccredited,
    is_favorite: i % 4 === 0,
    red_bet_with_vat: false,
    red_bet_no_vat: false,
    is_last_bet_with_vat: yourLastBet !== null ? vatRate !== null : null,
    send_deal_before_load: false,
    price_start: priceStart,
    price_current: priceCurrent,
    price_min: priceMin !== null ? round2(priceMin) : null,
    price_max: priceMax !== null ? round2(priceMax) : null,
    price_step: step,
    price_available:
      canSetBet && priceCurrent !== null && step !== null
        ? round2(aucType === 'Up' ? priceCurrent + step : priceCurrent - step)
        : null,
    distance,
    vat_rate: vatRate,
    organizer: {
      subscriber_id: int(rng, 50, 200),
      subscriber_code: String(int(rng, 10000, 99999)),
      infobase_code: 'RU_Cargo_01',
      organization_id: 340 + i,
      organization_name: org.name,
      organization_inn: org.inn,
      organization_kpp: org.kpp,
      is_hide_organization: i % 9 === 5,
    },
    load: {
      city: loadCity.name,
      address: `Транспортная ${int(rng, 1, 40)}`,
      date: iso(loadDate),
      city_gc_id: loadCity.gc_id,
      points_count: i % 4 === 2 ? 2 : 1,
    },
    unload: {
      city: unloadCity.name,
      address: `Складская ${int(rng, 1, 30)}`,
      date: iso(unloadDate),
      city_gc_id: unloadCity.gc_id,
      points_count: 1,
    },
    cargo: {
      name: pick(rng, CARGO_NAMES),
      weight,
      volume,
      body_type: bodyType,
      truck_count: i % 5 === 2 ? 2 : 1,
      is_cargo: true,
      is_international: i % 8 === 2,
      containered: i % 6 === 4,
      temp_from: bodyType === 'рефрижератор' ? -20 : null,
      temp_to: bodyType === 'рефрижератор' ? -12 : null,
      adr: i % 10 === 3 ? int(rng, 1, 9) : null,
      price: String(int(rng, 0, 500) * 1000),
      car: i % 5 === 3 ? null : {
        type: 'Тягач',
        weight: 20,
        volume: 82,
        width: 2.4,
        length: 13.6,
        height: 2.7,
      },
    },
    payment: {
      form: vatRate ? 'Безналичная с НДС' : 'Безналичная без НДС',
      currency_code: '643',
      condition: i % 2 === 0 ? 'По оригиналам накладных (ТН, ТТН, CMR)' : null,
      delay: i % 3 === 0 ? null : int(rng, 5, 45),
      delay_type: i % 3 === 0 ? null : i % 2 === 0 ? 'CalendarDays' : 'WorkDays',
      prepay: i % 4 === 1 ? '30' : null,
      consignor: null,
      consignee: null,
    },
    contacts:
      i % 5 === 0
        ? [] // контакты скрыты/отсутствуют
        : [
            { name: `Смирнова Анна`, phone: `+7912${String(int(rng, 1000000, 9999999))}`, email: 'logist@example.com' },
          ],
    // Допущенные к торгам организации пользователя; пусто, если допуска нет.
    admitted_organizations: isAdmitted
      ? [
          {
            id: CURRENT_USER.organization_id,
            inn: CURRENT_USER.organization_inn,
            is_main: true,
            name: CURRENT_USER.organization_name,
            full_name: 'Общество с ограниченной ответственностью «ТестПеревоз»',
            subscriber_id: CURRENT_USER.subscriber_id,
            subscriber_code: '54321',
            current_vat_rate: '20',
          },
        ]
      : [],
    assembly:
      i % 10 === 7
        ? { num: `SB-${1000 + i}`, date: iso(addHours(loadDate, -4)) }
        : { num: null, date: null },
    settings: {
      prolong_after_bet: i % 2 === 0 ? 10 : null,
      winner_confirm: 1,
      winner_counter_mode: null,
      transmission_time_in: 24,
      coefficient: 10,
    },
    bets,
    your_bet: isBidder && !mineCanceled, // отменённая ставка — не активная
    your_last_bet: yourLastBet,
    your_last_bet_with_vat: yourLastBet,
    your_win: statusMobile === 'Winner' || statusMobile === 'Confirmed',
  };
}

/** Генерирует детерминированный набор аукционов, покрывающий edge-cases схемы. */
export function generateMockAuctions(count = 48, seed = 42): MockAuction[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => buildAuction(rng, i));
}
