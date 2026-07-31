import { describe, expect, it } from 'vitest';
import { resolveBetAvailability } from './resolve-bet-availability';

describe('resolveBetAvailability', () => {
  it('can_set_bet=true — ставка доступна независимо от остального', () => {
    expect(
      resolveBetAvailability({ canSetBet: true, status: 'Auction', admittedCount: 1 }),
    ).toEqual({ kind: 'available' });
  });

  it('торги не идут (статус не Auction) — closed со статусом', () => {
    expect(
      resolveBetAvailability({ canSetBet: false, status: 'Finished', admittedCount: 1 }),
    ).toEqual({ kind: 'closed', status: 'Finished' });
    expect(
      resolveBetAvailability({ canSetBet: false, status: 'Planning', admittedCount: 0 }),
    ).toEqual({ kind: 'closed', status: 'Planning' });
  });

  it('торги идут, но нет допущенных организаций — not-admitted', () => {
    expect(
      resolveBetAvailability({ canSetBet: false, status: 'Auction', admittedCount: 0 }),
    ).toEqual({ kind: 'not-admitted' });
  });

  it('торги идут и допуск есть, но can_set_bet=false — прочая причина', () => {
    expect(
      resolveBetAvailability({ canSetBet: false, status: 'Auction', admittedCount: 2 }),
    ).toEqual({ kind: 'unavailable' });
  });

  it('статус не задан — closed без статуса', () => {
    expect(resolveBetAvailability({ canSetBet: false, admittedCount: 1 })).toEqual({
      kind: 'closed',
      status: undefined,
    });
  });
});
