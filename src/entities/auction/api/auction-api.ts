import { apiClient } from '@/shared/api/client';
import { unwrap } from '@/shared/api/errors';
import type {
  AuctionListRequest,
  AuctionListResponse,
  AuctionShowResponse,
  BetListResponse,
} from '../model/types';

/** Фабрика ключей TanStack Query для иерархической инвалидации. */
export const auctionKeys = {
  all: ['auctions'] as const,
  lists: () => [...auctionKeys.all, 'list'] as const,
  list: (filters: AuctionListRequest) => [...auctionKeys.lists(), filters] as const,
  details: () => [...auctionKeys.all, 'detail'] as const,
  detail: (auctionUuid: string) => [...auctionKeys.details(), auctionUuid] as const,
  bets: (auctionUuid: string) => [...auctionKeys.detail(auctionUuid), 'bets'] as const,
};

export const auctionApi = {
  list: (body: AuctionListRequest): Promise<AuctionListResponse> =>
    unwrap(apiClient.POST('/auctions/list', { body })),

  get: (auctionUuid: string): Promise<AuctionShowResponse> =>
    unwrap(
      apiClient.GET('/auctions/{auctionUuid}', {
        params: { path: { auctionUuid } },
      }),
    ),

  bets: (auctionUuid: string, all?: boolean): Promise<BetListResponse> =>
    unwrap(
      apiClient.GET('/auctions/{auctionUuid}/bets', {
        params: { path: { auctionUuid }, query: { all } },
      }),
    ),

  /** 200 без тела по схеме — результат читаем из инвалидированных запросов. */
  setBet: (auctionUuid: string, price: number): Promise<unknown> =>
    unwrap(
      apiClient.POST('/auctions/{auctionUuid}/bets', {
        params: { path: { auctionUuid } },
        body: { price },
      }),
    ),
};
