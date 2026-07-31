/** 12000000 → "12 000 000" (разделитель — неразрывный пробел, ru-RU). undefined/NaN → пустая строка. */
export function formatPrice(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.trunc(value));
}

/** "12 000 000 ₽" → 12000000. Пустой ввод → undefined. Дробная часть отбрасывается. */
export function parsePrice(input: string): number | undefined {
  const digits = input.replace(/[^\d]/g, '');
  if (digits === '') return undefined;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : undefined;
}

/** Проверка диапазона «от/до»: возвращает текст ошибки или null. */
export function priceRangeError(
  from: number | undefined,
  to: number | undefined,
): string | null {
  if (from !== undefined && to !== undefined && from > to) {
    return '«Цена от» не может быть больше, чем «Цена до»';
  }
  return null;
}
