import { createFileRoute } from '@tanstack/react-router';
import { AuctionsListPage } from '@/pages/auctions-list/ui/auctions-list-page.component';
import {
  parseAuctionsSearch,
  stripEmptySearch,
  toRouterSearch,
} from '@/features/auction-filters/model/search-params';

export const Route = createFileRoute('/')({
  // Храним в URL только не-дефолтные значения; при чтении parse снова подставит дефолты.
  validateSearch: (search) => toRouterSearch(stripEmptySearch(parseAuctionsSearch(search))),
  component: AuctionsListPage,
});
