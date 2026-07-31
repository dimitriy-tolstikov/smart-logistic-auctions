import type { BetItem } from '../model/types';

interface OrganizationRef {
  id?: number;
  subscriber_id?: number | null;
}

/**
 * Своя ставка: в BetItem нет явного признака «моя», поэтому сверяем
 * организацию/подписчика ставки с допущенными организациями пользователя.
 */
export function isOwnBet(bet: BetItem, admittedOrganizations: OrganizationRef[]): boolean {
  return admittedOrganizations.some(
    (o) =>
      (o.id !== undefined && o.id === bet.organization_id) ||
      (o.subscriber_id != null && o.subscriber_id === bet.subscriber_id),
  );
}
