import { useState } from 'react';
import { AmountInput } from '@/shared/ui/amount-input.component';
import { Button } from '@/shared/ui/button.component';
import { Checkbox } from '@/shared/ui/checkbox.component';
import { DateInput } from '@/shared/ui/date-input.component';
import { Input } from '@/shared/ui/input.component';
import { Label } from '@/shared/ui/label.component';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select.component';
import { priceRangeError } from '@/shared/lib/format-price';
import { CITIES } from '@/shared/api/mocks/data/cities';
import { AUCTION_STATUS_LABELS, AUCTION_TYPE_LABELS, TRADING_STATUS_LABELS } from '@/entities/auction/model/labels';
import {
  AUCTION_STATUS_CODE,
  FILTER_AUC_TYPES,
  FILTER_AUCTION_STATUSES,
  FILTER_TRADING_STATUSES,
  type AuctionsSearch,
} from '../model/search-params';

interface AuctionFiltersPanelProps {
  value: AuctionsSearch;
  onApply: (next: AuctionsSearch) => void;
  onReset: () => void;
}

export function AuctionFiltersPanel({ value, onApply, onReset }: AuctionFiltersPanelProps) {
  const [draft, setDraft] = useState<AuctionsSearch>(value);
  const [open, setOpen] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);

  const patch = (p: Partial<AuctionsSearch>) => setDraft((d) => ({ ...d, ...p }));

  const patchPrice = (p: Partial<AuctionsSearch>) => {
    setPriceError(null);
    patch(p);
  };

  const apply = () => {
    const error = priceRangeError(draft.current_price_from, draft.current_price_to);
    if (error) {
      setPriceError(error);
      return;
    }
    onApply(draft);
  };

  const toggleInArray = <T extends string>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const toggleCode = (codes: number[], code: number): number[] =>
    codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code];

  const citySelect = (
    key: 'load_city' | 'unload_city',
    label: string,
  ) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select
        value={draft[key] ?? ''}
        onValueChange={(v) => {
          const val = v === '__all__' ? undefined : v;
          patch(key === 'load_city' ? { load_city: val } : { unload_city: val });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Все" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Все</SelectItem>
          {CITIES.map((c) => (
            <SelectItem key={c.gc_id} value={c.name}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Фильтры</h2>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Скрыть' : 'Показать'}
        </Button>
      </div>

      <div className={open ? 'mt-4 space-y-4' : 'hidden'}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="f-cargo-num">Номер заявки</Label>
            <Input
              id="f-cargo-num"
              value={draft.cargo_num ?? ''}
              onChange={(e) => patch({ cargo_num: e.target.value.trim() || undefined })}
              placeholder="00000001059"
            />
          </div>
          {citySelect('load_city', 'Город погрузки')}
          {citySelect('unload_city', 'Город выгрузки')}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="f-date-from">Погрузка от</Label>
              <DateInput
                id="f-date-from"
                value={draft.load_date_from ?? ''}
                onChange={(e) => patch({ load_date_from: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="f-date-to">Погрузка до</Label>
              <DateInput
                id="f-date-to"
                value={draft.load_date_to ?? ''}
                onChange={(e) => patch({ load_date_to: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="f-price-from">Цена от, ₽</Label>
                <AmountInput
                  id="f-price-from"
                  aria-invalid={priceError !== null}
                  value={draft.current_price_from}
                  onChange={(v) => patchPrice({ current_price_from: v })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="f-price-to">Цена до, ₽</Label>
                <AmountInput
                  id="f-price-to"
                  aria-invalid={priceError !== null}
                  value={draft.current_price_to}
                  onChange={(v) => patchPrice({ current_price_to: v })}
                />
              </div>
            </div>
            {priceError && <p className="text-sm text-red-600">{priceError}</p>}
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.is_available === true}
                onCheckedChange={(c) => patch({ is_available: c === true ? true : undefined })}
              />
              Доступные для ставки
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.is_bidder === true}
                onCheckedChange={(c) => patch({ is_bidder: c === true ? true : undefined })}
              />
              Я участвую
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Тип аукциона</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {FILTER_AUC_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.auc_type.includes(t)}
                    onCheckedChange={() => patch({ auc_type: toggleInArray(draft.auc_type, t) })}
                  />
                  {AUCTION_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Статус аукциона</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {FILTER_AUCTION_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.statuses.includes(AUCTION_STATUS_CODE[s])}
                    onCheckedChange={() => patch({ statuses: toggleCode(draft.statuses, AUCTION_STATUS_CODE[s]) })}
                  />
                  {AUCTION_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Мой торговый статус</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {FILTER_TRADING_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.status.includes(s)}
                    onCheckedChange={() => patch({ status: toggleInArray(draft.status, s) })}
                  />
                  {TRADING_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex gap-2">
          <Button onClick={apply}>Применить</Button>
          <Button
            variant="outline"
            onClick={() => {
              setPriceError(null);
              setDraft(value);
              onReset();
            }}
          >
            Сбросить
          </Button>
        </div>
      </div>
    </section>
  );
}
