import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/errors';
import { Badge } from '@/shared/ui/badge.component';
import { Button } from '@/shared/ui/button.component';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card.component';
import { Skeleton } from '@/shared/ui/skeleton.component';
import { auctionsQueryOptions } from '@/entities/auction/api/queries';
import { formatDateTime, formatMoney } from '@/entities/auction/lib/format';
import { isOwnBet } from '@/entities/auction/lib/is-own-bet';
import type { AuctionShowResponse, BetItem } from '@/entities/auction/model/types';

interface BetsHistoryPanelProps {
  auctionUuid: string;
  detail: AuctionShowResponse;
}

function BetBadges({ bet }: { bet: BetItem }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {bet.is_win && (
        <Badge variant="outline" className="bg-emerald-600 text-white border-emerald-600">
          Победитель
        </Badge>
      )}
      {bet.is_counter && <Badge variant="outline">Встречная</Badge>}
      {bet.is_rejected && (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
          Отклонена
        </Badge>
      )}
      {bet.cancel_reason && (
        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
          Отменена: {bet.cancel_reason}
        </Badge>
      )}
    </span>
  );
}

/** История ставок аукциона. При hide_bets_history запрос не выполняется. */
export function BetsHistoryPanel({ auctionUuid, detail }: BetsHistoryPanelProps) {
  const hideHistory = detail.hide_bets_history ?? detail.trading?.hide_bets_history ?? false;
  const { data, isPending, isError, error, refetch } = useQuery({
    ...auctionsQueryOptions.bets(auctionUuid, true),
    enabled: !hideHistory,
  });
  const admitted = detail.admitted_organizations ?? [];
  // Участники — уникальные организации среди активных (не отменённых) ставок.
  const participants =
    data?.bets.filter((b) => !b.cancel_reason && !b.is_rejected) ?? [];
  const participantsCount = new Set(
    participants.map((b) => b.organization_id ?? b.organization_name ?? ''),
  ).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          История ставок
          {data && data.bets.length > 0 && (
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              · участников: {participantsCount}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {hideHistory && (
          <div className="text-muted-foreground rounded-md border border-dashed p-3">
            История ставок скрыта организатором
          </div>
        )}

        {!hideHistory && isPending && (
          <div className="flex flex-col gap-2" aria-label="Загрузка">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {!hideHistory && isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="mb-3 text-sm text-red-800">
              {error instanceof ApiError
                ? `${error.problem.title}: ${error.problem.message}`
                : error instanceof Error
                  ? error.message
                  : 'Неизвестная ошибка'}
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Повторить
            </Button>
          </div>
        )}

        {!hideHistory && data && data.bets.length === 0 && (
          <div className="text-muted-foreground">Ставок пока нет</div>
        )}

        {!hideHistory && data && data.bets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-muted-foreground border-b text-xs">
                  <th className="py-2 pr-3 font-medium">Место</th>
                  <th className="py-2 pr-3 font-medium">Перевозчик</th>
                  <th className="py-2 pr-3 font-medium">Ставка с НДС</th>
                  <th className="py-2 pr-3 font-medium">Без НДС</th>
                  <th className="py-2 pr-3 font-medium">Время</th>
                  <th className="py-2 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {data.bets.map((bet) => {
                  const own = isOwnBet(bet, admitted);
                  return (
                    <tr
                      key={bet.id ?? `${bet.created_at}-${bet.price_with_vat}`}
                      className={own ? 'bg-green-50' : undefined}
                    >
                      <td className="py-2 pr-3">{bet.place ?? '—'}</td>
                      <td className="py-2 pr-3">
                        {own ? (
                          <span className="font-medium text-green-700">Вы</span>
                        ) : (
                          bet.organization_name || '—'
                        )}
                      </td>
                      <td className="py-2 pr-3 font-medium">{formatMoney(bet.price_with_vat)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{formatMoney(bet.price_no_vat)}</td>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(bet.created_at)}
                      </td>
                      <td className="py-2">
                        <BetBadges bet={bet} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
