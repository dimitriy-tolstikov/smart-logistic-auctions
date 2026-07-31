import { queryOptions } from '@tanstack/react-query';
import type { AuctionListRequest } from '../model/types';
import { auctionApi, auctionKeys } from './auction-api';

export const auctionsQueryOptions = {
  list: (filters: AuctionListRequest) =>
    queryOptions({
      queryKey: auctionKeys.list(filters),
      queryFn: () => auctionApi.list(filters),
    }),

  detail: (auctionUuid: string) =>
    queryOptions({
      queryKey: auctionKeys.detail(auctionUuid),
      queryFn: () => auctionApi.get(auctionUuid),
    }),

  bets: (auctionUuid: string, all?: boolean) =>
    queryOptions({
      queryKey: [...auctionKeys.bets(auctionUuid), { all: Boolean(all) }] as const,
      queryFn: () => auctionApi.bets(auctionUuid, all),
    }),
};
