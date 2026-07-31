import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button.component';
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/ui/card.component';
import type { AuctionListItem } from '../model/types';
import { resolveCardAction } from '../lib/resolve-card-action';
import {
  formatDateTime,
  formatMoney,
  formatPricePerKm,
  formatVolume,
  formatWeight,
} from '../lib/format';
import { AuctionStatusBadge, AuctionTypeBadge, TradingStatusBadge } from './auction-badges.component';

interface AuctionCardProps {
  item: AuctionListItem;
  onPrefetch?: (auctionUuid: string) => void;
}

export function AuctionCard({ item, onPrefetch }: AuctionCardProps) {
  const { main, organizer, route, cargo, trading } = item;
  const uuid = main?.order_uid ?? '';
  const action = resolveCardAction(item);
  const prefetch = () => {
    if (uuid) onPrefetch?.(uuid);
  };

  return (
    <Card
      className="relative flex flex-col transition-shadow hover:shadow-md"
      onMouseEnter={prefetch}
      onFocus={prefetch}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/auctions/$auctionUuid"
            params={{ auctionUuid: uuid }}
            className="text-base font-semibold after:absolute after:inset-0 hover:underline"
          >
            № {main?.cargo_num ?? '—'}
          </Link>
          <AuctionTypeBadge type={main?.auc_type} />
          <AuctionStatusBadge status={trading?.status} />
          <TradingStatusBadge status={trading?.status_mobile} />
        </div>
        <div className="text-muted-foreground text-sm">
          {organizer?.is_hide_organization ? 'Организатор скрыт' : (organizer?.organization_name ?? '—')}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <span>{route?.load?.city ?? '—'}</span>
          <span className="text-muted-foreground">→</span>
          <span>{route?.unload?.city ?? '—'}</span>
        </div>
        <div className="text-muted-foreground grid grid-cols-1 gap-1 sm:grid-cols-2">
          <span>Погрузка: {formatDateTime(route?.load?.date)}</span>
          <span>Выгрузка: {formatDateTime(route?.unload?.date)}</span>
        </div>
        <div className="text-muted-foreground">
          {cargo?.name ?? '—'} · {formatWeight(cargo?.weight)} · {formatVolume(cargo?.volume)} ·{' '}
          {cargo?.body_type ?? '—'}
        </div>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-lg font-semibold">
            {trading?.price ? formatMoney(trading.price.current) : 'Цена не указана'}
          </span>
          <span className="text-muted-foreground text-sm">
            {formatPricePerKm(main?.price_per_km)}
          </span>
          <span className="text-sm">
            {trading?.your?.bet ? (
              <span className="text-green-700">Моя ставка: {formatMoney(trading.your.last_bet)}</span>
            ) : (
              <span className="text-muted-foreground">Моей ставки нет</span>
            )}
          </span>
        </div>
      </CardContent>

      <CardFooter className="relative z-10 pt-3">
        {action.kind === 'bet' && (
          <Button asChild size="sm">
            <Link to="/auctions/$auctionUuid/bet" params={{ auctionUuid: uuid }}>
              {action.label}
            </Link>
          </Button>
        )}
        {action.kind === 'view' && (
          <Button asChild variant="outline" size="sm">
            <Link to="/auctions/$auctionUuid" params={{ auctionUuid: uuid }}>
              {action.label}
            </Link>
          </Button>
        )}
        {action.kind === 'disabled' && (
          <Button size="sm" disabled>
            {action.label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
