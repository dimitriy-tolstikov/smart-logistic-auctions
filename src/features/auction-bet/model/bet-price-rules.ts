import { z } from 'zod';
import type { AuctionType } from '@/entities/auction/model/types';
import { formatPrice } from '@/shared/lib/format-price';

/** Ограничения цены из detail (trading.price); null — параметр не задан. */
export interface BetPriceConstraints {
  min?: number | null;
  max?: number | null;
  step?: number | null;
  /** Текущая цена и тип торгов — для правила «ставка должна улучшать текущую цену». */
  current?: number | null;
  aucType?: AuctionType | null;
}

/**
 * Проверка сетки шага — правило повторяет мок (store.setBet):
 * (price - min) должно быть кратно step, с допуском на погрешность float.
 */
export function isOnStepGrid(price: number, min: number, step: number): boolean {
  const steps = (price - min) / step;
  return Math.abs(steps - Math.round(steps)) <= 1e-6;
}

/** Ближайшая к price цена на сетке шага: min + n·step. */
export function nearestOnStepGrid(price: number, min: number, step: number): number {
  return min + Math.round((price - min) / step) * step;
}

/**
 * Текст ошибки для ставки или null, если значение валидно.
 * Повторяет детерминированные проверки мока: > 0, min/max, кратность шагу.
 */
export function betPriceError(price: number, constraints: BetPriceConstraints): string | null {
  if (!Number.isFinite(price) || price <= 0) return 'Цена должна быть больше 0.';
  if (constraints.min != null && price < constraints.min) {
    return `Цена не может быть меньше ${formatPrice(constraints.min)} ₽.`;
  }
  if (constraints.max != null && price > constraints.max) {
    return `Цена не может быть больше ${formatPrice(constraints.max)} ₽.`;
  }
  // Ставка обязана улучшать текущую цену: ниже для Down/Request, выше для Up.
  if (
    constraints.current != null &&
    constraints.aucType != null &&
    constraints.aucType !== 'FixPrice' &&
    constraints.aucType !== 'Unknown'
  ) {
    const up = constraints.aucType === 'Up';
    const improves = up ? price > constraints.current : price < constraints.current;
    if (!improves) {
      return `Ставка должна быть ${up ? 'выше' : 'ниже'} текущей цены ${formatPrice(constraints.current)} ₽.`;
    }
  }
  if (
    constraints.step != null &&
    constraints.min != null &&
    !isOnStepGrid(price, constraints.min, constraints.step)
  ) {
    const nearest = nearestOnStepGrid(price, constraints.min, constraints.step);
    return (
      `Цена должна быть кратна шагу ставки ${formatPrice(constraints.step)} ₽. ` +
      `Ближайшая подходящая ставка: ${formatPrice(nearest)} ₽.`
    );
  }
  return null;
}

/** Zod-схема формы ставки по ограничениям из detail. */
export function makeBetFormSchema(constraints: BetPriceConstraints) {
  return z.object({
    price: z
      .number({ required_error: 'Укажите ставку.', invalid_type_error: 'Укажите ставку.' })
      .superRefine((price, ctx) => {
        const message = betPriceError(price, constraints);
        if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }),
  });
}

export type BetFormValues = z.input<ReturnType<typeof makeBetFormSchema>>;
