import { describe, expect, it } from 'vitest';
import { isOwnBet } from './is-own-bet';

describe('isOwnBet', () => {
  const admitted = [
    { id: 14, subscriber_id: 13 },
    { id: 20, subscriber_id: null },
  ];

  it('совпадение по organization_id — своя ставка', () => {
    expect(isOwnBet({ organization_id: 14 }, admitted)).toBe(true);
  });

  it('совпадение по subscriber_id — своя ставка', () => {
    expect(isOwnBet({ organization_id: 999, subscriber_id: 13 }, admitted)).toBe(true);
  });

  it('нет совпадений — чужая ставка', () => {
    expect(isOwnBet({ organization_id: 100, subscriber_id: 500 }, admitted)).toBe(false);
  });

  it('пустой список допущенных — чужая ставка', () => {
    expect(isOwnBet({ organization_id: 14 }, [])).toBe(false);
  });

  it('undefined поля ставки не дают ложных совпадений', () => {
    expect(isOwnBet({}, admitted)).toBe(false);
  });
});
