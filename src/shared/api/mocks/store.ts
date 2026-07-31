import type {
  AuctionListRequest,
  AuctionListResponse,
  AuctionStatus,
  BetListResponse,
} from '@/entities/auction/model/types';
import type { MockAuction, MockBet } from './model';
import { toBetItem, toListItem, toShowResponse } from './mappers';
import { CURRENT_USER, generateMockAuctions } from './data/seed';

/** Код статуса аукциона для числового фильтра statuses (1–8), по описанию схемы. */
const STATUS_CODE: Record<AuctionStatus, number> = {
  Planning: 1,
  Auction: 2,
  DeterminateWinner: 3,
  WaitDeal: 4,
  InProgress: 5,
  Finished: 6,
  Stopped: 7,
  Canceled: 8,
  Unknown: 9,
};

export class BetRejected extends Error {
  constructor(
    readonly fieldErrors: Array<{ field: string; message: string; code?: string | null }>,
  ) {
    super(fieldErrors[0]?.message ?? 'Ставка отклонена');
    this.name = 'BetRejected';
  }
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const noVat = (withVat: number, vatRate: number | null): number =>
  vatRate ? round2(withVat / (1 + vatRate / 100)) : withVat;

const active = (b: MockBet) => b.cancel_reason === '' && !b.is_rejected;

/** Лучшая ставка — меньшая для Down/Request/FixPrice, большая для Up. */
function betWins(a: MockAuction, better: number, worse: number): boolean {
  return a.auc_type === 'Up' ? better > worse : better < worse;
}

export class MockAuctionsStore {
  private auctions: MockAuction[];

  constructor(seed?: number) {
    this.auctions = generateMockAuctions(48, seed);
    this.auctions.forEach((a) => this.recomputePlaces(a));
  }

  /** Полный сброс состояния (для тестов). */
  reset(seed?: number): void {
    this.auctions = generateMockAuctions(48, seed);
    this.auctions.forEach((a) => this.recomputePlaces(a));
  }

  findByUuid(auctionUuid: string): MockAuction | undefined {
    return this.auctions.find((a) => a.uuid === auctionUuid);
  }

  list(req: AuctionListRequest): AuctionListResponse {
    let items = this.auctions.slice();

    if (req.cargo_num) {
      const q = req.cargo_num.toLowerCase();
      items = items.filter((a) => a.cargo_num.toLowerCase().includes(q));
    }
    if (req.status?.length) {
      items = items.filter((a) => req.status!.includes(a.status_mobile));
    }
    if (req.statuses?.length) {
      items = items.filter((a) => req.statuses!.includes(STATUS_CODE[a.status]));
    }
    if (req.auc_type?.length) {
      items = items.filter((a) => (req.auc_type as string[]).includes(a.auc_type));
    }
    if (req.load_city) {
      items = items.filter((a) => a.load.city.toLowerCase() === req.load_city!.toLowerCase());
    }
    if (req.unload_city) {
      items = items.filter((a) => a.unload.city.toLowerCase() === req.unload_city!.toLowerCase());
    }
    if (req.load_gc_id !== undefined) {
      items = items.filter((a) => a.load.city_gc_id === req.load_gc_id);
    }
    if (req.unload_gc_id !== undefined) {
      items = items.filter((a) => a.unload.city_gc_id === req.unload_gc_id);
    }
    if (req.load_date_from) {
      const from = new Date(req.load_date_from).getTime();
      items = items.filter((a) => new Date(a.load.date).getTime() >= from);
    }
    if (req.load_date_to) {
      const to = new Date(req.load_date_to).getTime();
      items = items.filter((a) => new Date(a.load.date).getTime() <= to);
    }
    if (req.is_available !== undefined) {
      items = items.filter((a) => a.is_available === req.is_available);
    }
    if (req.is_bidder !== undefined) {
      items = items.filter((a) => a.is_bidder === req.is_bidder);
    }
    if (req.is_favorite !== undefined) {
      items = items.filter((a) => a.is_favorite === req.is_favorite);
    }
    if (req.current_price_from != null) {
      items = items.filter((a) => a.price_current !== null && a.price_current >= req.current_price_from!);
    }
    if (req.current_price_to != null) {
      items = items.filter((a) => a.price_current !== null && a.price_current <= req.current_price_to!);
    }
    if (req.weight_from != null) {
      items = items.filter((a) => a.cargo.weight >= req.weight_from!);
    }
    if (req.weight_to != null) {
      items = items.filter((a) => a.cargo.weight <= req.weight_to!);
    }
    if (req.volume_from != null) {
      items = items.filter((a) => a.cargo.volume >= req.volume_from!);
    }
    if (req.volume_to != null) {
      items = items.filter((a) => a.cargo.volume <= req.volume_to!);
    }
    if (req.body_types?.length) {
      items = items.filter((a) => req.body_types!.includes(a.cargo.body_type));
    }
    if (req.customer) {
      const q = req.customer.toLowerCase();
      items = items.filter(
        (a) =>
          a.organizer.organization_name.toLowerCase().includes(q) ||
          a.organizer.organization_inn.includes(q),
      );
    }

    items = this.applySort(items, req);

    const total = items.length;
    const page = req.page ?? 1;
    const perPage = req.per_page ?? 20;
    const lastPage = Math.max(Math.ceil(total / perPage), 1);
    const start = (page - 1) * perPage;
    const pageItems = items.slice(start, start + perPage);

    return {
      data: pageItems.map(toListItem),
      meta: {
        current_page: page,
        from: total === 0 ? 0 : start + 1,
        last_page: lastPage,
        per_page: perPage,
        to: Math.min(start + perPage, total),
        total,
      },
    };
  }

  private applySort(items: MockAuction[], req: AuctionListRequest): MockAuction[] {
    const sorted = items.slice();
    if (req.sort) {
      // Стабильная сортировка по нескольким полям: применяем в обратном порядке.
      const entries = Object.entries(req.sort).reverse();
      for (const [field, dir] of entries) {
        const mul = dir === 'asc' ? 1 : -1;
        sorted.sort((a, b) => {
          const va = this.sortField(a, field);
          const vb = this.sortField(b, field);
          // Отсутствующие значения — всегда в конец, независимо от направления.
          if (va === Number.POSITIVE_INFINITY && vb === Number.POSITIVE_INFINITY) return 0;
          if (va === Number.POSITIVE_INFINITY) return 1;
          if (vb === Number.POSITIVE_INFINITY) return -1;
          return mul * (va - vb);
        });
      }
      return sorted;
    }
    const mul = req.is_oldest ? 1 : -1;
    sorted.sort((a, b) => mul * (Date.parse(a.cargo_date) - Date.parse(b.cargo_date)));
    return sorted;
  }

  private sortField(a: MockAuction, field: string): number {
    switch (field) {
      case 'start_time':
        return Date.parse(a.start_time);
      case 'price_per_km':
        return a.price_current !== null && a.distance
          ? a.price_current / a.distance
          : Number.POSITIVE_INFINITY;
      case 'current_price':
        return a.price_current ?? Number.POSITIVE_INFINITY;
      default:
        return 0;
    }
  }

  getShow(auctionUuid: string) {
    const a = this.findByUuid(auctionUuid);
    return a ? toShowResponse(a) : undefined;
  }

  listBets(auctionUuid: string, all?: boolean): BetListResponse | undefined {
    const a = this.findByUuid(auctionUuid);
    if (!a) return undefined;
    const bets = a.bets
      .filter((b) => all || active(b))
      .slice()
      .sort((x, y) => {
        if ((x.place ?? 999) !== (y.place ?? 999)) return (x.place ?? 999) - (y.place ?? 999);
        return Date.parse(x.created_at) - Date.parse(y.created_at);
      })
      .map((b) => ({ ...toBetItem(b, a.hide_places), auction_id: a.id }));
    return { bets };
  }

  /**
   * Установка ставки: валидация по min/max/step из detail DTO,
   * затем мутация цены, статуса пользователя и рейтинга ставок.
   */
  setBet(auctionUuid: string, price: number): void {
    const a = this.findByUuid(auctionUuid);
    if (!a) throw new Error('not_found');

    const errors: Array<{ field: string; message: string; code?: string | null }> = [];
    if (!a.can_set_bet) {
      errors.push({ field: 'price', message: 'Ставки по этому аукциону не принимаются.', code: 'forbidden' });
    }
    if (!Number.isFinite(price) || price <= 0) {
      errors.push({ field: 'price', message: 'Цена должна быть больше 0.', code: 'min_value' });
    }
    if (a.price_min !== null && price < a.price_min) {
      errors.push({ field: 'price', message: `Цена не может быть меньше ${a.price_min}.`, code: 'min_value' });
    }
    if (a.price_max !== null && price > a.price_max) {
      errors.push({ field: 'price', message: `Цена не может быть больше ${a.price_max}.`, code: 'max_value' });
    }
    // Новая ставка обязана улучшать текущую цену: ниже для Down/Request, выше для Up.
    // FixPrice — цена фиксирована, улучшать нечего.
    if (
      a.price_current !== null &&
      a.auc_type !== 'FixPrice' &&
      a.auc_type !== 'Unknown' &&
      Number.isFinite(price) &&
      price > 0
    ) {
      const up = a.auc_type === 'Up';
      const improves = up ? price > a.price_current : price < a.price_current;
      if (!improves) {
        errors.push({
          field: 'price',
          message: up
            ? `Ставка должна быть выше текущей цены ${a.price_current}.`
            : `Ставка должна быть ниже текущей цены ${a.price_current}.`,
          code: 'not_improved',
        });
      }
    }
    if (a.price_step !== null && a.price_min !== null && Number.isFinite(price) && price > 0) {
      const steps = (price - a.price_min) / a.price_step;
      if (Math.abs(steps - Math.round(steps)) > 1e-6) {
        errors.push({ field: 'price', message: `Цена должна быть кратна шагу ставки ${a.price_step}.`, code: 'step' });
      }
    }
    if (errors.length) throw new BetRejected(errors);

    // «Изменить ставку»: прежняя активная ставка пользователя отменяется —
    // у участника только одна активная ставка; прежняя остаётся в истории.
    for (const b of a.bets) {
      if (b.is_mine && active(b)) b.cancel_reason = 'Изменена новой ставкой';
    }

    const now = new Date();
    const bet: MockBet = {
      id: Math.max(0, ...a.bets.map((b) => b.id)) + 1,
      created_at: now.toISOString().slice(0, 19),
      subscriber_id: CURRENT_USER.subscriber_id,
      contact_name: CURRENT_USER.contact_name,
      contact_phone: CURRENT_USER.contact_phone,
      price_with_vat: price,
      price_no_vat: noVat(price, a.vat_rate),
      organization_id: CURRENT_USER.organization_id,
      organization_inn: CURRENT_USER.organization_inn,
      organization_name: CURRENT_USER.organization_name,
      transporter_comment: null,
      is_rejected: false,
      is_counter: false,
      is_win: false,
      run_number: 0,
      cancel_reason: '',
      place: null,
      payment_type: a.payment.form,
      vat_rate: a.vat_rate ? String(a.vat_rate) : null,
      is_mine: true,
    };
    a.bets.push(bet);

    // Мутация состояния аукциона после ставки.
    if (a.auc_type !== 'FixPrice' && a.price_current !== null) {
      a.price_current = price;
    }
    if (a.price_available !== null && a.price_step !== null) {
      a.price_available = round2(a.auc_type === 'Up' ? price + a.price_step : price - a.price_step);
    }
    if (a.auc_type === 'Down' && a.price_step !== null) {
      a.price_max = round2(price - a.price_step);
    }
    if (a.auc_type === 'Up' && a.price_step !== null) {
      a.price_min = round2(price + a.price_step);
    }
    a.your_bet = true;
    a.is_bidder = true;
    a.your_last_bet = price;
    a.your_last_bet_with_vat = price;
    a.is_last_bet_with_vat = a.vat_rate !== null;

    this.recomputePlaces(a);
    const myPlace = bet.place;
    if (a.status === 'Auction') {
      a.status_mobile = myPlace === 1 ? 'Leading' : 'Losing';
      a.your_win = false;
    }
  }

  /** Рейтинг активных ставок: место 1 — лучшая по направлению торгов. */
  private recomputePlaces(a: MockAuction): void {
    const activeBets = a.bets.filter(active);
    activeBets.sort((x, y) =>
      betWins(a, x.price_with_vat, y.price_with_vat)
        ? -1
        : betWins(a, y.price_with_vat, x.price_with_vat)
          ? 1
          : Date.parse(x.created_at) - Date.parse(y.created_at),
    );
    activeBets.forEach((b, idx) => {
      b.place = idx + 1;
    });
    for (const b of a.bets) {
      if (!active(b)) b.place = null;
      b.is_win = (a.status === 'Finished' || a.status === 'WaitDeal') && b.place === 1;
    }
    if (a.status === 'Finished' || a.status === 'WaitDeal') {
      const myBest = a.bets.find((b) => b.is_mine && b.place === 1);
      a.your_win = Boolean(myBest);
      // Исправляем только противоречия; Confirmed не понижаем до Winner.
      if (myBest && (a.status_mobile === 'Losing' || a.status_mobile === 'NotParticipating')) {
        a.status_mobile = 'Winner';
      }
    }
  }
}

/** Синглтон стора для MSW-хендлеров. */
export const mockStore = new MockAuctionsStore();
