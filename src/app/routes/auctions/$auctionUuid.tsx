import { createFileRoute } from '@tanstack/react-router';
import { AuctionDetailPage } from '@/pages/auction-detail/ui/auction-detail-page.component';

export const Route = createFileRoute('/auctions/$auctionUuid')({
  component: AuctionDetailPage,
});
