export type BetAvailability =
  | { kind: 'available' }
  | { kind: 'closed'; status?: string }
  | { kind: 'not-admitted' }
  | { kind: 'unavailable' };

interface BetAvailabilityInput {
  canSetBet?: boolean;
  status?: string;
  /** Число организаций пользователя, допущенных к торгам (admitted_organizations). */
  admittedCount: number;
}

/**
 * Причина недоступности ставки по detail DTO.
 * В detail нет is_accredited/is_admitted (в отличие от элемента списка),
 * поэтому допуск определяем по непустому admitted_organizations.
 */
export function resolveBetAvailability(input: BetAvailabilityInput): BetAvailability {
  if (input.canSetBet) return { kind: 'available' };
  if (input.status !== 'Auction') return { kind: 'closed', status: input.status };
  if (input.admittedCount === 0) return { kind: 'not-admitted' };
  return { kind: 'unavailable' };
}
