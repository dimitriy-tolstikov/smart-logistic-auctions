import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ApiError } from '@/shared/api/errors';
import { saveLastListSearch } from '@/shared/lib/last-list-search';
import { Button } from '@/shared/ui/button.component';
import { Skeleton } from '@/shared/ui/skeleton.component';
import { PaginationBar } from '@/shared/ui/pagination-bar.component';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select.component';
import { AuctionCard } from '@/entities/auction/ui/auction-card.component';
import { auctionsQueryOptions } from '@/entities/auction/api/queries';
import { AuctionFiltersPanel } from '@/features/auction-filters/ui/auction-filters-panel.component';
import { buildListRequest } from '@/features/auction-filters/model/build-list-request';
import {
  parseAuctionsSearch,
  PER_PAGE_OPTIONS,
  stripEmptySearch,
  toRouterSearch,
  type AuctionsSearch,
} from '@/features/auction-filters/model/search-params';

const routeApi = getRouteApi('/');

export function AuctionsListPage() {
  // validateSearch может вернуть частичный объект (URL без дефолтов) — восстанавливаем их.
  const search = parseAuctionsSearch(routeApi.useSearch());
  const navigate = useNavigate({ from: '/' });
  const queryClient = useQueryClient();

  const request = buildListRequest(search);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useQuery(
    auctionsQueryOptions.list(request),
  );

  // Запоминаем фильтры, чтобы «← К списку» с детальной вернул в ту же выдачу.
  useEffect(() => {
    saveLastListSearch(search);
  }, [search]);

  const applySearch = (next: AuctionsSearch) =>
    navigate({ search: () => toRouterSearch(stripEmptySearch({ ...next, page: 1 })), replace: true });

  const prefetchDetail = (auctionUuid: string) =>
    void queryClient.prefetchQuery(auctionsQueryOptions.detail(auctionUuid));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Аукционы</h1>

      <AuctionFiltersPanel
        key={JSON.stringify(search)}
        value={search}
        onApply={applySearch}
        onReset={() => navigate({ search: () => toRouterSearch({}), replace: true })}
      />

      {isPending && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Загрузка">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-1 font-medium text-red-800">Не удалось загрузить список аукционов</p>
          <p className="text-muted-foreground mb-4 text-sm">
            {error instanceof ApiError
              ? `${error.problem.title}: ${error.problem.message}`
              : error instanceof Error
                ? error.message
                : 'Неизвестная ошибка'}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            Повторить
          </Button>
        </div>
      )}

      {data && data.data && data.data.length === 0 && (
        <div className="rounded-lg border p-10 text-center">
          <p className="mb-1 font-medium">Ничего не найдено</p>
          <p className="text-muted-foreground mb-4 text-sm">Попробуйте изменить или сбросить фильтры</p>
          <Button variant="outline" onClick={() => navigate({ search: () => toRouterSearch({}), replace: true })}>
            Сбросить фильтры
          </Button>
        </div>
      )}

      {data && data.data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy={isPlaceholderData}>
            {data.data.map((item) => (
              <AuctionCard
                key={item.main?.order_uid ?? item.main?.id}
                item={item}
                onPrefetch={prefetchDetail}
              />
            ))}
          </div>
          {data.meta && (
            <PaginationBar
              page={data.meta.current_page ?? search.page}
              lastPage={data.meta.last_page ?? 1}
              total={data.meta.total ?? 0}
              onPageChange={(page) =>
                navigate({ search: () => toRouterSearch(stripEmptySearch({ ...search, page })), replace: true })
              }
            />
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">На странице:</span>
            <Select
              value={String(search.per_page)}
              onValueChange={(v) =>
                navigate({
                  search: () => toRouterSearch(stripEmptySearch({ ...search, per_page: Number(v), page: 1 })),
                  replace: true,
                })
              }
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
