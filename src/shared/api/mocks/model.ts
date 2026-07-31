import type {
  AuctionStatus,
  AuctionType,
  BidMeasurementType,
  TradingStatus,
} from '@/entities/auction/model/types';

/** Торговый статус пользователя — узкий enum из AuctionListItemTrading (detail-enum шире). */
export type MobileTradingStatus = Extract<
  TradingStatus,
  'NotParticipating' | 'Leading' | 'Losing' | 'Winner' | 'Confirmed' | 'Unknown'
>;

/** Внутренняя ставка стора. is_mine — признак ставки «текущего пользователя». */
export interface MockBet {
  id: number;
  created_at: string;
  subscriber_id: number;
  contact_name: string;
  contact_phone: string;
  price_with_vat: number;
  price_no_vat: number;
  organization_id: number;
  organization_inn: string;
  organization_name: string;
  transporter_comment: string | null;
  is_rejected: boolean;
  is_counter: boolean;
  is_win: boolean;
  run_number: number;
  /** Пустая строка — ставка не отменена (по описанию поля в схеме). */
  cancel_reason: string;
  place: number | null;
  payment_type: string | null;
  vat_rate: string | null;
  is_mine: boolean;
}

/** Внутренняя модель аукциона: надмножество list/detail DTO. */
export interface MockAuction {
  id: number;
  /** order_uid — используется как auctionUuid в URL. */
  uuid: string;
  cargo_num: string;
  cargo_date: string;
  created_at: string;
  priority_sort: number;
  is_assembly: boolean;

  auc_type: AuctionType;
  status: AuctionStatus;
  status_mobile: MobileTradingStatus;
  start_time: string;
  stop_time: string;
  bid_measurement_type: BidMeasurementType | null;

  can_set_bet: boolean;
  allow_counter_bets: boolean;
  hide_bets_history: boolean;
  hide_places: boolean;
  no_view_cargo_price: boolean;
  hide_points_address_and_contacts: boolean;
  direction: string | null;
  comment: string | null;
  is_bidder: boolean;
  is_available: boolean;
  is_accredited: boolean;
  is_favorite: boolean;
  red_bet_with_vat: boolean;
  red_bet_no_vat: boolean;
  is_last_bet_with_vat: boolean | null;
  send_deal_before_load: boolean;

  /** Цены с НДС; no_vat вычисляется по vat_rate. */
  price_start: number | null;
  price_current: number | null;
  price_min: number | null;
  price_max: number | null;
  price_step: number | null;
  /** Доступная для ставки цена (current ± step), null если торги не идут. */
  price_available: number | null;
  distance: number | null;
  /** Ставка НДС в процентах, null — форма оплаты без НДС. */
  vat_rate: number | null;

  organizer: {
    subscriber_id: number;
    subscriber_code: string;
    infobase_code: string;
    organization_id: number;
    organization_name: string;
    organization_inn: string;
    organization_kpp: string;
    is_hide_organization: boolean;
  };

  load: { city: string; address: string; date: string; city_gc_id: number; points_count: number };
  unload: { city: string; address: string; date: string; city_gc_id: number; points_count: number };

  cargo: {
    name: string;
    weight: number;
    volume: number;
    body_type: string;
    truck_count: number;
    is_cargo: boolean;
    is_international: boolean;
    containered: boolean;
    temp_from: number | null;
    temp_to: number | null;
    adr: number | null;
    price: string;
    car: {
      type: string;
      weight: number;
      volume: number;
      width: number;
      length: number;
      height: number;
    } | null;
  };

  payment: {
    form: string;
    currency_code: string;
    condition: string | null;
    delay: number | null;
    delay_type: 'CalendarDays' | 'WorkDays' | null;
    prepay: string | null;
    consignor: string | null;
    consignee: string | null;
  };

  contacts: Array<{ name: string | null; phone: string | null; email: string | null }>;
  admitted_organizations: Array<{
    id: number;
    inn: string;
    is_main: boolean;
    name: string;
    full_name: string;
    subscriber_id: number;
    subscriber_code: string;
    current_vat_rate: string | null;
  }>;
  assembly: { num: string | null; date: string | null };
  settings: {
    prolong_after_bet: number | null;
    winner_confirm: number | null;
    winner_counter_mode: number | null;
    transmission_time_in: number | null;
    coefficient: number | null;
  };

  bets: MockBet[];
  your_bet: boolean;
  your_last_bet: number | null;
  your_last_bet_with_vat: number | null;
  your_win: boolean;
}
