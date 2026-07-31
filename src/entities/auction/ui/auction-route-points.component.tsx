import { Badge } from '@/shared/ui/badge.component';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card.component';
import type { AuctionShowResponse } from '../model/types';
import { formatDateTime } from '../lib/format';

const OP_LABELS: Record<string, string> = {
  Loading: 'Погрузка',
  Unloading: 'Выгрузка',
};

interface AuctionRoutePointsProps {
  routes: AuctionShowResponse['routes'];
  contacts: AuctionShowResponse['contacts'];
  hideAddressAndContacts?: boolean;
}

/** Маршрут детальной страницы: точки погрузки/выгрузки и контакты организатора. */
export function AuctionRoutePoints({
  routes,
  contacts,
  hideAddressAndContacts,
}: AuctionRoutePointsProps) {
  const points = [...(routes ?? [])].sort((a, b) => (a.row_num ?? 0) - (b.row_num ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Маршрут</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {points.length === 0 && <div className="text-muted-foreground">Точки маршрута не указаны</div>}
        {points.map((point, i) => (
          <div key={point.row_num ?? i} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                {OP_LABELS[point.op_type ?? ''] ?? 'Точка маршрута'}
              </Badge>
              <span className="font-medium">
                {point.location?.city_full_name || point.location?.city_name || '—'}
              </span>
            </div>
            <div className="text-muted-foreground">
              {formatDateTime(point.start_date)}
              {point.end_date && point.end_date !== point.start_date
                ? ` — ${formatDateTime(point.end_date)}`
                : ''}
            </div>
            {!hideAddressAndContacts && (
              <>
                <div>Адрес: {point.location?.loading_address || '—'}</div>
                {(point.contact?.name || point.contact?.phone) && (
                  <div>
                    Контакт: {[point.contact?.name, point.contact?.phone].filter(Boolean).join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {hideAddressAndContacts && (
          <div className="text-muted-foreground rounded-md border border-dashed p-3">
            Адреса и контакты скрыты организатором
          </div>
        )}
        {!hideAddressAndContacts && contacts.length > 0 && (
          <div className="text-muted-foreground">
            Контакты организатора:{' '}
            {contacts
              .map((c) => [c.name, c.phone].filter(Boolean).join(' — '))
              .filter(Boolean)
              .join('; ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
