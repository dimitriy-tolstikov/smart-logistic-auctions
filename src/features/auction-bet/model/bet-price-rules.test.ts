import { describe, expect, it } from 'vitest';
import { betPriceError, isOnStepGrid, makeBetFormSchema } from './bet-price-rules';

// ICU может отдавать U+00A0 или U+202F — нормализуем к обычному пробелу для сравнения.
const norm = (s: string | null): string | null => s?.replace(/[\u00A0\u202F]/g, ' ') ?? null;

describe('isOnStepGrid', () => {
  it('пропускает значения на сетке (price - min кратно step)', () => {
    expect(isOnStepGrid(20000, 20000, 500)).toBe(true);
    expect(isOnStepGrid(20500, 20000, 500)).toBe(true);
    expect(isOnStepGrid(19500, 20000, 500)).toBe(true);
  });

  it('отклоняет значения вне сетки', () => {
    expect(isOnStepGrid(20501, 20000, 500)).toBe(false);
    expect(isOnStepGrid(20250, 20000, 500)).toBe(false);
  });

  it('терпит погрешность float', () => {
    // 100.5 - 100.1 = 0.3999999999999986, что всё ещё ~2 шага по 0.2.
    expect(isOnStepGrid(100.5, 100.1, 0.2)).toBe(true);
    expect(isOnStepGrid(100.55, 100.1, 0.2)).toBe(false);
  });
});

describe('betPriceError', () => {
  it('требует положительную цену', () => {
    expect(betPriceError(0, {})).toBe('Цена должна быть больше 0.');
    expect(betPriceError(-100, {})).toBe('Цена должна быть больше 0.');
    expect(betPriceError(NaN, {})).toBe('Цена должна быть больше 0.');
  });

  it('проверяет min/max, когда они заданы', () => {
    expect(norm(betPriceError(19999, { min: 20000 }))).toBe('Цена не может быть меньше 20 000 ₽.');
    expect(norm(betPriceError(30001, { max: 30000 }))).toBe('Цена не может быть больше 30 000 ₽.');
    expect(betPriceError(25000, { min: 20000, max: 30000 })).toBeNull();
  });

  it('проверяет кратность шагу от min и подсказывает ближайшую ставку', () => {
    expect(norm(betPriceError(20250, { min: 20000, step: 500 }))).toBe(
      'Цена должна быть кратна шагу ставки 500 ₽. Ближайшая подходящая ставка: 20 500 ₽.',
    );
    // Ближайшая может быть и ниже введённой.
    expect(norm(betPriceError(20240, { min: 20000, step: 500 }))).toBe(
      'Цена должна быть кратна шагу ставки 500 ₽. Ближайшая подходящая ставка: 20 000 ₽.',
    );
    expect(betPriceError(20500, { min: 20000, step: 500 })).toBeNull();
  });

  it('без min шаг не проверяется (как в моке)', () => {
    expect(betPriceError(20250, { step: 500 })).toBeNull();
  });

  it('требует улучшать текущую цену по направлению торгов', () => {
    // Down/Request: только ниже текущей.
    expect(norm(betPriceError(55000, { current: 55000, aucType: 'Down' }))).toBe(
      'Ставка должна быть ниже текущей цены 55 000 ₽.',
    );
    expect(norm(betPriceError(60000, { current: 55000, aucType: 'Down' }))).toBe(
      'Ставка должна быть ниже текущей цены 55 000 ₽.',
    );
    expect(betPriceError(50000, { current: 55000, aucType: 'Down' })).toBeNull();
    // Up: только выше текущей.
    expect(norm(betPriceError(50000, { current: 55000, aucType: 'Up' }))).toBe(
      'Ставка должна быть выше текущей цены 55 000 ₽.',
    );
    expect(betPriceError(60000, { current: 55000, aucType: 'Up' })).toBeNull();
    // FixPrice и отсутствующая текущая цена — без проверки улучшения.
    expect(betPriceError(55000, { current: 55000, aucType: 'FixPrice' })).toBeNull();
    expect(betPriceError(55000, { aucType: 'Down' })).toBeNull();
  });

  it('без ограничений валидна любая положительная цена', () => {
    expect(betPriceError(1, {})).toBeNull();
  });
});

describe('makeBetFormSchema', () => {
  const schema = makeBetFormSchema({ min: 20000, max: 30000, step: 500 });

  it('требует заполнения поля', () => {
    const result = schema.safeParse({ price: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Укажите ставку.');
    }
  });

  it('принимает валидное значение', () => {
    expect(schema.safeParse({ price: 25000 }).success).toBe(true);
  });

  it('отклоняет значение вне сетки шага', () => {
    const result = schema.safeParse({ price: 25123 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('кратна шагу');
    }
  });
});
