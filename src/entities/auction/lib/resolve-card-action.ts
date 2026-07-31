import type { AuctionListItem } from '../model/types';

export type CardAction =
  | { kind: 'bet'; label: string }
  | { kind: 'view'; label: string }
  | { kind: 'disabled'; label: string };

const VIEW_BETS_STATUSES = ['DeterminateWinner', 'WaitDeal', 'InProgress', 'Finished'];

/** Primary action карточки по торговым данным элемента списка. */
export function resolveCardAction(item: AuctionListItem): CardAction {
  const trading = item.trading;
  if (trading?.can_set_bet) {
    return { kind: 'bet', label: trading.your?.bet ? 'Изменить ставку' : 'Сделать ставку' };
  }
  if (trading?.status && VIEW_BETS_STATUSES.includes(trading.status)) {
    return { kind: 'view', label: 'Смотреть ставки' };
  }
  return { kind: 'disabled', label: 'Ставки недоступны' };
}
