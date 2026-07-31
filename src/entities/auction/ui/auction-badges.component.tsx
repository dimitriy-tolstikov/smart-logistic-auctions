import { Badge } from '@/shared/ui/badge.component';
import {
  auctionStatusLabel,
  auctionTypeLabel,
  tradingStatusLabel,
} from '../model/labels';

const AUCTION_STATUS_CLASSES: Record<string, string> = {
  Planning: 'bg-slate-100 text-slate-700 border-slate-200',
  Auction: 'bg-green-100 text-green-800 border-green-200',
  DeterminateWinner: 'bg-amber-100 text-amber-800 border-amber-200',
  WaitDeal: 'bg-amber-100 text-amber-800 border-amber-200',
  InProgress: 'bg-blue-100 text-blue-800 border-blue-200',
  Finished: 'bg-gray-100 text-gray-700 border-gray-200',
  Stopped: 'bg-red-100 text-red-800 border-red-200',
  Canceled: 'bg-red-100 text-red-800 border-red-200',
};

const TRADING_STATUS_CLASSES: Record<string, string> = {
  NotParticipating: 'bg-gray-100 text-gray-600 border-gray-200',
  Leading: 'bg-green-100 text-green-800 border-green-200',
  Losing: 'bg-red-100 text-red-800 border-red-200',
  Winner: 'bg-emerald-600 text-white border-emerald-600',
  Confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
};

const AUCTION_TYPE_CLASSES: Record<string, string> = {
  Request: 'bg-violet-100 text-violet-800 border-violet-200',
  Up: 'bg-orange-100 text-orange-800 border-orange-200',
  Down: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  FixPrice: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const fallback = 'bg-gray-100 text-gray-600 border-gray-200';

export function AuctionStatusBadge({ status }: { status?: string }) {
  return (
    <Badge variant="outline" className={AUCTION_STATUS_CLASSES[status ?? ''] ?? fallback}>
      {auctionStatusLabel(status)}
    </Badge>
  );
}

export function TradingStatusBadge({ status }: { status?: string }) {
  return (
    <Badge variant="outline" className={TRADING_STATUS_CLASSES[status ?? ''] ?? fallback}>
      {tradingStatusLabel(status)}
    </Badge>
  );
}

export function AuctionTypeBadge({ type }: { type?: string }) {
  return (
    <Badge variant="outline" className={AUCTION_TYPE_CLASSES[type ?? ''] ?? fallback}>
      {auctionTypeLabel(type)}
    </Badge>
  );
}
