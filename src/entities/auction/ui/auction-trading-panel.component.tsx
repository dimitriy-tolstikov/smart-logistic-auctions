import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button.component';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card.component';
import type { AuctionShowResponse } from '../model/types';
import { formatDateTime, formatMoney, formatPricePerKm } from '../lib/format';
import { resolveBetAvailability } from '../lib/resolve-bet-availability';
import { auctionStatusLabel } from '../model/labels';

interface AuctionTradingPanelProps {
  detail: AuctionShowResponse;
}

function PriceRow({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatMoney(value)}</span>
    </div>
  );
}

/** Параметры торгов детальной страницы: цены, своя ставка и действие «Сделать ставку». */
export function AuctionTradingPanel({ detail }: AuctionTradingPanelProps) {
  const { trading, main } = detail;
  const price = trading?.price;
  const your = trading?.your;
  const uuid = main?.order_uid ?? '';
  const availability = resolveBetAvailability({
    canSetBet: trading?.can_set_bet,
    status: trading?.status,
    admittedCount: detail.admitted_organizations?.length ?? 0,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Торги</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-2xl font-bold">
            {price?.current !== null && price?.current !== undefined
              ? formatMoney(price.current)
              : 'Цена не указана'}
          </span>
          <span className="text-muted-foreground">{formatPricePerKm(price?.price_per_km)}</span>
        </div>

        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-8">
          <PriceRow label="Стартовая цена" value={price?.start} />
          <PriceRow label="Доступная ставка" value={price?.available} />
          <PriceRow label="Минимальная цена" value={price?.min} />
          <PriceRow label="Максимальная цена" value={price?.max} />
          <PriceRow label="Шаг ставки" value={price?.step} />
        </div>

        <div className="text-muted-foreground grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-8">
          <span>Начало торгов: {formatDateTime(trading?.start_time)}</span>
          <span>Окончание торгов: {formatDateTime(trading?.stop_time)}</span>
        </div>

        <div>
          {your?.bet ? (
            <span className="text-green-700">
              Моя ставка: {formatMoney(your.last_bet_with_vat ?? your.last_bet)}
              {your.win ? ' — победная' : ''}
            </span>
          ) : (
            <span className="text-muted-foreground">Моей ставки нет</span>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {availability.kind === 'available' ? (
          <Button asChild size="sm">
            <Link to="/auctions/$auctionUuid/bet" params={{ auctionUuid: uuid }}>
              {your?.bet ? 'Изменить ставку' : 'Сделать ставку'}
            </Link>
          </Button>
        ) : (
          <div className="text-muted-foreground text-sm">
            {availability.kind === 'closed' &&
              `Ставки недоступны: аукцион в статусе «${auctionStatusLabel(availability.status)}»`}
            {availability.kind === 'not-admitted' &&
              'Ставки недоступны: ваша организация не допущена к торгам'}
            {availability.kind === 'unavailable' && 'Ставки недоступны'}
          </div>
        )}
        {(detail.admitted_organizations?.length ?? 0) > 0 && (
          <div className="text-muted-foreground text-xs">
            Допущенные организации:{' '}
            {detail.admitted_organizations.map((o) => o.name || o.full_name || o.inn).join(', ')}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
