import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ApiError } from '@/shared/api/errors';
import { formatPrice } from '@/shared/lib/format-price';
import { AmountInput } from '@/shared/ui/amount-input.component';
import { Button } from '@/shared/ui/button.component';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card.component';
import { Label } from '@/shared/ui/label.component';
import { Skeleton } from '@/shared/ui/skeleton.component';
import { auctionApi, auctionKeys } from '@/entities/auction/api/auction-api';
import { auctionsQueryOptions } from '@/entities/auction/api/queries';
import type { AuctionShowResponse } from '@/entities/auction/model/types';
import { makeBetFormSchema, type BetFormValues } from '@/features/auction-bet/model/bet-price-rules';

const routeApi = getRouteApi('/auctions/$auctionUuid_/bet');

function BackLink({ uuid }: { uuid: string }) {
  return (
    <Link
      to="/auctions/$auctionUuid"
      params={{ auctionUuid: uuid }}
      className="text-muted-foreground text-sm hover:underline"
    >
      ← К аукциону
    </Link>
  );
}

const money = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${formatPrice(v)} ₽`;

function PriceRow({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{money(value)}</span>
    </div>
  );
}

/** Сводка торгов: текущие рамки цены до отправки ставки. */
function TradingSummary({ detail }: { detail: AuctionShowResponse }) {
  const price = detail.trading?.price;
  const your = detail.trading?.your;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Торги</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <PriceRow label="Текущая цена" value={price?.current} />
        <PriceRow label="Доступная ставка" value={price?.available} />
        <PriceRow label="Шаг ставки" value={price?.step} />
        <PriceRow label="Минимальная цена" value={price?.min} />
        <PriceRow label="Максимальная цена" value={price?.max} />
        {your?.bet && (
          <PriceRow label="Моя ставка" value={your.last_bet_with_vat ?? your.last_bet} />
        )}
      </CardContent>
    </Card>
  );
}

/** Форма установки/изменения ставки: RHF + zod, правила повторяют валидацию мока. */
function BetForm({ detail }: { detail: AuctionShowResponse }) {
  const uuid = detail.main?.order_uid ?? '';
  const price = detail.trading?.price;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<BetFormValues>({
    resolver: zodResolver(
      makeBetFormSchema({
        min: price?.min,
        max: price?.max,
        step: price?.step,
        current: price?.current,
        aucType: detail.main?.auc_type,
      }),
    ),
    defaultValues: { price: undefined },
  });

  const mutation = useMutation({
    mutationFn: (value: number) => auctionApi.setBet(uuid, value),
    onSuccess: async () => {
      // Ответ 200 без тела — актуальные данные подтягиваем инвалидацией.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: auctionKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: auctionKeys.detail(uuid) }),
        queryClient.invalidateQueries({ queryKey: auctionKeys.bets(uuid) }),
      ]);
      toast.success('Ставка принята');
      void navigate({ to: '/auctions/$auctionUuid', params: { auctionUuid: uuid } });
    },
    onError: (error) => {
      // 422: переносим сообщение сервера на поле формы.
      if (error instanceof ApiError && error.isValidation) {
        const priceError = error.fieldErrors.find((e) => e.field === 'price');
        if (priceError) {
          setError('price', { type: 'server', message: priceError.message });
          return;
        }
      }
      const message =
        error instanceof ApiError
          ? `${error.problem.title}: ${error.problem.message}`
          : error instanceof Error
            ? error.message
            : 'Неизвестная ошибка';
      setServerError(message);
      toast.error('Ставка не принята', { description: message });
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    mutation.mutate(values.price);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ставка</CardTitle>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-3 text-sm">
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
              {serverError}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bet-price">Ставка с НДС, ₽</Label>
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <AmountInput
                  id="bet-price"
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={Boolean(errors.price)}
                  autoFocus
                />
              )}
            />
            {errors.price ? (
              <span className="text-sm text-red-600">{errors.price.message}</span>
            ) : (
              <span className="text-muted-foreground text-xs">
                Доступная ставка: {money(price?.available)} · Шаг ставки: {money(price?.step)}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Отправка…'
              : detail.trading?.your?.bet
                ? 'Изменить ставку'
                : 'Сделать ставку'}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/auctions/$auctionUuid" params={{ auctionUuid: uuid }}>
              Отмена
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function AuctionBetPage() {
  const { auctionUuid } = routeApi.useParams();
  const { data, isPending, isError, error, refetch } = useQuery(
    auctionsQueryOptions.detail(auctionUuid),
  );

  if (isPending) {
    return (
      <div className="space-y-4" aria-label="Загрузка">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4">
        <BackLink uuid={auctionUuid} />
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
          {!notFound && (
            <Button variant="outline" onClick={() => void refetch()}>
              Повторить
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const canSetBet = data.trading?.can_set_bet === true;

  return (
    <div className="space-y-4">
      <BackLink uuid={auctionUuid} />

      <h1 className="text-2xl font-bold">Ставка по аукциону № {data.main?.cargo_num ?? '—'}</h1>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <TradingSummary detail={data} />
        {canSetBet ? (
          <BetForm detail={data} />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="mb-4 font-medium text-amber-800">Ставка недоступна</p>
            <Button asChild variant="outline">
              <Link to="/auctions/$auctionUuid" params={{ auctionUuid }}>
                К аукциону
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
