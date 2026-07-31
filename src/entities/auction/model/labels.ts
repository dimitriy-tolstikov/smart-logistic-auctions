import type { AuctionStatus, AuctionType, TradingStatus } from './types';

export const AUCTION_STATUS_LABELS: Record<string, string> = {
  Planning: 'Планирование',
  Auction: 'Торги идут',
  DeterminateWinner: 'Выбор победителя',
  WaitDeal: 'Ожидание сделки',
  InProgress: 'В работе',
  Finished: 'Завершён',
  Stopped: 'Остановлен',
  Canceled: 'Отменён',
  Unknown: 'Неизвестен',
};

export const AUCTION_TYPE_LABELS: Record<string, string> = {
  Request: 'Заявочный',
  Up: 'На повышение',
  Down: 'На понижение',
  FixPrice: 'Фикс. цена',
  Unknown: 'Не определён',
};

export const TRADING_STATUS_LABELS: Record<string, string> = {
  NotParticipating: 'Не участвует',
  Leading: 'Лидирует',
  Losing: 'Перебит',
  OnPending: 'На рассмотрении',
  Confirmed: 'Подтверждён',
  ChoosingWinner: 'Выбор победителя',
  Winner: 'Победитель',
  Accepted: 'Принят',
  Unknown: 'Неизвестен',
};

export const auctionStatusLabel = (s: AuctionStatus | string | undefined): string =>
  (s && AUCTION_STATUS_LABELS[s]) || 'Неизвестен';

export const auctionTypeLabel = (t: AuctionType | string | undefined): string =>
  (t && AUCTION_TYPE_LABELS[t]) || 'Неизвестный тип';

export const tradingStatusLabel = (s: TradingStatus | string | undefined): string =>
  (s && TRADING_STATUS_LABELS[s]) || 'Неизвестен';
