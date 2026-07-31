import { getRouteApi, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/button.component';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card.component';
import { Skeleton } from '@/shared/ui/skeleton.component';
import { auctionsQueryOptions } from '@/entities/auction/api/queries';
import { formatVolume, formatWeight } from '@/entities/auction/lib/format';
import type { AuctionShowResponse } from '@/entities/auction/model/types';
import {
  AuctionStatusBadge,
  AuctionTypeBadge,
  TradingStatusBadge,
} from '@/entities/auction/ui/auction-badges.component';
import { AuctionRoutePoints } from '@/entities/auction/ui/auction-route-points.component';
import { AuctionTradingPanel } from '@/entities/auction/ui/auction-trading-panel.component';
import { parseAuctionsSearch, stripEmptySearch, toRouterSearch } from '@/features/auction-filters/model/search-params';
import { readLastListSearch } from '@/shared/lib/last-list-search';
import { BetsHistoryPanel } from './bets-history-panel.component';

const routeApi = getRouteApi('/auctions/$auctionUuid');

function BackLink() {
  // Возвращаем на список с теми же фильтрами, что были до перехода (sessionStorage).
  // stripEmptySearch повторно: readLastListSearch восстанавливает дефолты, а в URL они не нужны.
  const saved = readLastListSearch();
  return (
    <Link
      to="/"
      search={toRouterSearch(stripEmptySearch(saved ?? parseAuctionsSearch({})))}
      className="text-muted-foreground text-sm hover:underline"
    >
      ← К списку
    </Link>
  );
}

function CargoCard({ detail }: { detail: AuctionShowResponse }) {
  const cargo = detail.cargo;
  // Название/вес/объём груза в detail лежат только в routes[].cargo (строками).
  const routeCargo = detail.routes?.[0]?.cargo;
  const weight = routeCargo?.weight ? Number.parseFloat(routeCargo.weight) : undefined;
  const volume = routeCargo?.volume ? Number.parseFloat(routeCargo.volume) : undefined;
  const hideCargoPrice = detail.trading?.no_view_cargo_price ?? false;
  const car = cargo?.car;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Груз</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2 sm:gap-x-8">
        <span>Название: {routeCargo?.name || '—'}</span>
        <span>Тип кузова: {cargo?.body_type || '—'}</span>
        <span>Вес: {formatWeight(weight)}</span>
        <span>Объём: {formatVolume(volume)}</span>
        <span>Машин: {cargo?.truck_count ?? '—'}</span>
        <span>Расстояние: {cargo?.distance ? `${cargo.distance} км` : '—'}</span>
        {!hideCargoPrice && (
          <span>
            Цена груза: {cargo?.price ? `${Number(cargo.price).toLocaleString('ru-RU')} ₽` : '—'}
          </span>
        )}
        {hideCargoPrice && (
          <span className="text-muted-foreground">Цена груза скрыта организатором</span>
        )}
        {car && (
          <span className="sm:col-span-2">
            ТС: {car.type ?? '—'}
            {car.weight ? `, до ${car.weight} т` : ''}
            {car.volume ? `, ${car.volume} м³` : ''}
            {car.length && car.width && car.height
              ? ` (${car.length}×${car.width}×${car.height} м)`
              : ''}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

const DELAY_TYPE_LABELS: Record<string, string> = {
  CalendarDays: 'календарных',
  WorkDays: 'рабочих',
};

/** Условия оплаты из detail.payment. */
function PaymentCard({ detail }: { detail: AuctionShowResponse }) {
  const payment = detail.payment;
  if (!payment) return null;
  const delay =
    payment.delay != null
      ? `${payment.delay} ${DELAY_TYPE_LABELS[payment.delay_type ?? ''] ?? ''} дней`.trim()
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Оплата</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-1 text-sm">
        <span>Форма: {payment.form || '—'}</span>
        {payment.condition && <span>Условие: {payment.condition}</span>}
        {delay && <span>Отсрочка: {delay}</span>}
        {payment.prepay && <span>Предоплата: {payment.prepay}%</span>}
      </CardContent>
    </Card>
  );
}

export function AuctionDetailPage() {
  const { auctionUuid } = routeApi.useParams();
  const { data, isPending, isError, error, refetch } = useQuery(
    auctionsQueryOptions.detail(auctionUuid),
  );

  if (isPending) {
    return (
      <div className="space-y-4" aria-label="Загрузка">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-1 font-medium text-red-800">
            {notFound ? 'Аукцион не найден' : 'Не удалось загрузить аукцион'}
          </p>
          {!notFound && (
            <p className="text-muted-foreground mb-4 text-sm">
              {error instanceof ApiError
                ? `${error.problem.title}: ${error.problem.message}`
                : error instanceof Error
                  ? error.message
                  : 'Неизвестная ошибка'}
            </p>
          )}
          {notFound ? (
            <Button asChild variant="outline">
              <Link to="/" search={toRouterSearch({})}>
                К списку аукционов
              </Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void refetch()}>
              Повторить
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { main, organizer, trading } = data;
  const organizerName = organizer?.organization_name?.trim();

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Аукцион № {main?.cargo_num ?? '—'}</h1>
          <AuctionTypeBadge type={main?.auc_type} />
          <AuctionStatusBadge status={trading?.status} />
          <TradingStatusBadge status={trading?.status_mobile} />
        </div>
        <div className="text-muted-foreground text-sm">
          Организатор: {organizerName || 'Организатор скрыт'}
          {organizerName && organizer?.organization_inn ? ` (ИНН ${organizer.organization_inn})` : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <CargoCard detail={data} />
        <AuctionTradingPanel detail={data} />
        <PaymentCard detail={data} />
      </div>

      <AuctionRoutePoints
        routes={data.routes}
        contacts={data.contacts}
        hideAddressAndContacts={trading?.hide_points_address_and_contacts}
      />

      <BetsHistoryPanel auctionUuid={auctionUuid} detail={data} />
    </div>
  );
}
