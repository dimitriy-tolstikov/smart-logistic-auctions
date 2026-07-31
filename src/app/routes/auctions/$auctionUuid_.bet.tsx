import { createFileRoute } from '@tanstack/react-router';
import { AuctionBetPage } from '@/pages/auction-bet/ui/auction-bet-page.component';

export const Route = createFileRoute('/auctions/$auctionUuid_/bet')({
  component: AuctionBetPage,
});
