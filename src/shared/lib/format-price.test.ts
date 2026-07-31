import { describe, expect, it } from 'vitest';
import { formatPrice, parsePrice, priceRangeError } from './format-price';

// ICU может отдавать U+00A0 или U+202F — нормализуем к обычному пробелу для сравнения.
const norm = (s: string): string => s.replace(/[\u00A0\u202F]/g, ' ');

describe('formatPrice', () => {
  it('разбивает тысячи/миллионы/миллиарды неразрывным пробелом', () => {
    expect(norm(formatPrice(0))).toBe('0');
    expect(norm(formatPrice(999))).toBe('999');
    expect(norm(formatPrice(12000000))).toBe('12 000 000');
    expect(norm(formatPrice(1234567890))).toBe('1 234 567 890');
  });

  it('undefined и NaN дают пустую строку', () => {
    expect(formatPrice(undefined)).toBe('');
    expect(formatPrice(NaN)).toBe('');
  });
});

describe('parsePrice', () => {
  it('вытаскивает цифры из форматированной строки', () => {
    expect(parsePrice('12 000 000')).toBe(12000000);
    expect(parsePrice('1\u00A0234\u00A0567\u00A0890')).toBe(1234567890);
    expect(parsePrice('5000 руб.')).toBe(5000);
  });

  it('пустой ввод и мусор без цифр → undefined', () => {
    expect(parsePrice('')).toBe(undefined);
    expect(parsePrice('   ')).toBe(undefined);
    expect(parsePrice('abc')).toBe(undefined);
  });

  it('roundtrip: parsePrice(formatPrice(n)) === n', () => {
    for (const n of [1, 999, 100000, 9999999999]) {
      expect(parsePrice(formatPrice(n))).toBe(n);
    }
  });
});

describe('priceRangeError', () => {
  it('ругается, когда «от» больше «до»', () => {
    expect(priceRangeError(1000, 500)).toContain('не может быть больше');
  });

  it('пропускает корректный или неполный диапазон', () => {
    expect(priceRangeError(500, 1000)).toBeNull();
    expect(priceRangeError(1000, 1000)).toBeNull();
    expect(priceRangeError(1000, undefined)).toBeNull();
    expect(priceRangeError(undefined, 1000)).toBeNull();
    expect(priceRangeError(undefined, undefined)).toBeNull();
  });
});
