import type {
  AuctionListItem,
  AuctionShowResponse,
  BetItem,
} from '@/entities/auction/model/types';
import type { MockAuction, MockBet } from './model';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const noVat = (withVat: number, vatRate: number | null): number | null =>
  vatRate ? round2(withVat / (1 + vatRate / 100)) : withVat;

export function toListItem(a: MockAuction): AuctionListItem {
  return {
    main: {
      id: a.id,
      cargo_num: a.cargo_num,
      cargo_date: a.cargo_date,
      auc_type: a.auc_type,
      order_uid: a.uuid,
      created_at: a.created_at,
      priority_sort: a.priority_sort,
      is_assembly: a.is_assembly,
      price_per_km:
        a.price_current !== null && a.distance
          ? round2((noVat(a.price_current, a.vat_rate) ?? a.price_current) / a.distance)
          : null,
    },
    organizer: { ...a.organizer },
    route: {
      load: { ...a.load },
      unload: { ...a.unload },
    },
    cargo: {
      name: a.cargo.name,
      weight: a.cargo.weight,
      volume: a.cargo.volume,
      body_type: a.cargo.body_type,
      truck_count: a.cargo.truck_count,
      is_cargo: a.cargo.is_cargo,
      is_international: a.cargo.is_international ?? undefined,
      containered: a.cargo.containered ?? undefined,
      temp_from: a.cargo.temp_from ?? undefined,
      temp_to: a.cargo.temp_to ?? undefined,
      adr: a.cargo.adr ?? undefined,
      loading_types: { side: true, top: false, rear: true, full: false },
      docs: { tir: a.cargo.is_international, cmr: a.cargo.is_international, t1: false, med: false },
      car: a.cargo.car ? { ...a.cargo.car } : null,
    },
    trading: {
      status: a.status,
      status_mobile: a.status_mobile,
      start_time: a.start_time,
      stop_time: a.stop_time,
      bid_measurement_type: a.bid_measurement_type ?? undefined,
      can_set_bet: a.can_set_bet,
      allow_counter_bets: a.allow_counter_bets,
      hide_points_address_and_contacts: a.hide_points_address_and_contacts,
      direction: a.direction ?? undefined,
      comment: a.comment ?? undefined,
      is_bidder: a.is_bidder,
      is_available: a.is_available,
      is_accredited: a.is_accredited,
      is_favorite: a.is_favorite,
      price:
        a.price_current !== null
          ? {
              start: a.price_start ?? a.price_current,
              current: a.price_current,
              current_no_vat: noVat(a.price_current, a.vat_rate) ?? a.price_current,
            }
          : null,
      your: a.your_bet
        ? { bet: true, last_bet: a.your_last_bet }
        : null,
      red_bet_with_vat: a.red_bet_with_vat,
      red_bet_no_vat: a.red_bet_no_vat,
      is_last_bet_with_vat: a.is_last_bet_with_vat ?? undefined,
    },
    payment: {
      form: a.payment.form,
      currency_code: a.payment.currency_code,
      consignor: a.payment.consignor ?? undefined,
      consignee: a.payment.consignee ?? undefined,
    },
  };
}

export function toBetItem(b: MockBet, hidePlaces: boolean): BetItem {
  return {
    id: b.id,
    created_at: b.created_at,
    auction_id: 0, // подставляется в хендлере (знает id аукциона)
    subscriber_id: b.subscriber_id,
    contact_name: b.contact_name,
    contact_phone: b.contact_phone,
    price_with_vat: b.price_with_vat,
    price_no_vat: b.price_no_vat,
    organization_id: b.organization_id,
    organization_inn: b.organization_inn,
    organization_name: b.organization_name,
    transporter_comment: b.transporter_comment,
    is_rejected: b.is_rejected,
    is_counter: b.is_counter,
    place: hidePlaces ? null : b.place,
    is_win: b.is_win,
    run_number: b.run_number,
    cancel_reason: b.cancel_reason,
    price_info: {
      price_with_vat: b.price_with_vat,
      price_no_vat: b.price_no_vat,
      payment_type: b.payment_type,
      vat_rate: b.vat_rate,
    },
  };
}

export function toShowResponse(a: MockAuction): AuctionShowResponse {
  const nv = (v: number | null): number | null => (v === null ? null : (noVat(v, a.vat_rate) ?? v));
  return {
    main: {
      id: a.id,
      cargo_num: a.cargo_num,
      cargo_date: a.cargo_date,
      order_uid: a.uuid,
      auc_type: a.auc_type,
      created_at: a.created_at,
    },
    organizer: {
      subscriber_id: a.organizer.subscriber_id,
      subscriber_code: a.organizer.subscriber_code,
      infobase_code: a.organizer.infobase_code,
      organization_name: a.organizer.is_hide_organization ? '' : a.organizer.organization_name,
      organization_inn: a.organizer.is_hide_organization ? '' : a.organizer.organization_inn,
      organization_kpp: a.organizer.organization_kpp,
      organization_id: a.organizer.organization_id,
    },
    contacts: a.hide_points_address_and_contacts
      ? []
      : a.contacts.map((c) => ({ name: c.name, phone: c.phone, work_phone: null, uid: null, email: c.email })),
    cargo: {
      price: a.no_view_cargo_price ? '0' : a.cargo.price,
      currency: 643,
      is_international: a.cargo.is_international,
      distance: a.distance,
      truck_count: a.cargo.truck_count,
      body_type: a.cargo.body_type,
      temp_from: a.cargo.temp_from,
      temp_to: a.cargo.temp_to,
      conics: null,
      belts: null,
      adr: a.cargo.adr,
      coupling: null,
      air_pass: null,
      low_loader: null,
      additional_load: null,
      containered: a.cargo.containered,
      container_type: null,
      container_size: null,
      loading_types: { side: true, top: false, rear: true, full: false },
      docs: { tir: a.cargo.is_international, cmr: a.cargo.is_international, t1: false, med: false },
      car: a.cargo.car ? { ...a.cargo.car } : null,
    },
    trading: {
      status: a.status,
      status_mobile: a.status_mobile,
      start_time: a.start_time,
      stop_time: a.stop_time,
      bid_measurement_type: a.bid_measurement_type ?? undefined,
      can_set_bet: a.can_set_bet,
      allow_counter_bets: a.allow_counter_bets,
      hide_bets_history: a.hide_bets_history,
      hide_places: a.hide_places,
      no_view_cargo_price: a.no_view_cargo_price,
      hide_points_address_and_contacts: a.hide_points_address_and_contacts,
      is_bidder: a.is_bidder,
      is_favorite: a.is_favorite,
      is_last_bet_with_vat: a.is_last_bet_with_vat,
      red_bet_with_vat: a.red_bet_with_vat,
      red_bet_no_vat: a.red_bet_no_vat,
      send_deal_before_load: a.send_deal_before_load,
      chat_id: null,
      price: {
        start: a.price_start,
        start_no_vat: nv(a.price_start),
        current: a.price_current,
        current_no_vat: nv(a.price_current),
        available: a.price_available,
        available_no_vat: nv(a.price_available),
        min: a.price_min,
        min_no_vat: nv(a.price_min),
        max: a.price_max,
        max_no_vat: nv(a.price_max),
        step: a.price_step,
        step_no_vat: nv(a.price_step),
        price_per_km:
          a.price_current !== null && a.distance
            ? round2((nv(a.price_current) ?? a.price_current) / a.distance)
            : 0,
      },
      your: {
        bet: a.your_bet,
        last_bet: a.your_last_bet,
        last_bet_with_vat: a.your_last_bet_with_vat,
        win: a.your_win,
      },
      settings: { ...a.settings },
    },
    payment: {
      condition: a.payment.condition,
      condition_predefined: a.payment.condition ? 'ПоОригиналамНаладных' : null,
      form: a.payment.form,
      delay: a.payment.delay,
      delay_type: a.payment.delay_type,
      currency_code: a.payment.currency_code,
      prepay: a.payment.prepay,
    },
    assembly: { ...a.assembly },
    routes: buildRoutes(a),
    admitted_organizations: a.admitted_organizations.map((o) => ({
      id: o.id,
      inn: o.inn,
      is_main: o.is_main,
      name: o.name,
      full_name: o.full_name,
      site: null,
      subscriber_id: o.subscriber_id,
      subscriber_code: o.subscriber_code,
      subscriber_role: null,
      infobase_code: 'RU_Cargo_01',
      infobase_address: null,
      nalog_key: null,
      hide_me: false,
      current_vat_rate: o.current_vat_rate,
    })),
    hide_bets_history: a.hide_bets_history,
  };
}

function buildRoutes(a: MockAuction): AuctionShowResponse['routes'] {
  const hideAddr = a.hide_points_address_and_contacts;
  const cargoBlock = {
    name: a.cargo.name,
    package_name: '',
    weight: a.cargo.weight.toFixed(3),
    volume: a.cargo.volume.toFixed(3),
    length: '0',
    width: '0',
    height: '0',
    oversized: false,
    package_amount: null,
  };
  const points: AuctionShowResponse['routes'] = [];
  // Точек погрузки может быть несколько — разводим их по адресу, времени и контакту,
  // иначе в детальной странице дублируются одинаковые строки.
  const pointShift = (date: string, p: number): string =>
    // Даты сида — UTC-метки без 'Z' (см. iso() в seed.ts), парсим их как UTC,
    // иначе Date.parse трактует как локальное время и сдвиг уходит на величину таймзоны.
    p === 0 ? date : new Date(Date.parse(`${date}Z`) + p * 2 * 3_600_000).toISOString().slice(0, 19);
  for (let p = 0; p < a.load.points_count; p += 1) {
    const contact = a.contacts[p % Math.max(a.contacts.length, 1)];
    points.push({
      row_num: points.length + 1,
      op_type: 'Loading',
      start_date: pointShift(a.load.date, p),
      end_date: pointShift(a.load.date, p),
      comment: null,
      contractor: '',
      contractor_inn: '',
      location: {
        city_name: a.load.city,
        city_full_name: `${a.load.city}, Россия`,
        city_gc_id: a.load.city_gc_id,
        loading_address: hideAddr ? '' : p === 0 ? a.load.address : `${a.load.address}, стр. ${p + 1}`,
        lon: 56.238,
        lat: 58.01,
      },
      cargo: { ...cargoBlock },
      contact: {
        name: hideAddr ? '' : (contact?.name ?? ''),
        phone: hideAddr ? '' : (contact?.phone ?? ''),
      },
    });
  }
  for (let p = 0; p < a.unload.points_count; p += 1) {
    points.push({
      row_num: points.length + 1,
      op_type: 'Unloading',
      start_date: a.unload.date,
      end_date: a.unload.date,
      comment: null,
      contractor: '',
      contractor_inn: '',
      location: {
        city_name: a.unload.city,
        city_full_name: `${a.unload.city}, Россия`,
        city_gc_id: a.unload.city_gc_id,
        loading_address: hideAddr ? '' : a.unload.address,
        lon: 55.75,
        lat: 37.61,
      },
      cargo: { ...cargoBlock },
      contact: {
        name: hideAddr ? '' : (a.contacts[0]?.name ?? ''),
        phone: hideAddr ? '' : (a.contacts[0]?.phone ?? ''),
      },
    });
  }
  return points;
}
