const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const moneyPrecise = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export const formatMoney = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${money.format(v)} ₽`;

export const formatMoneyPrecise = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${moneyPrecise.format(v)} ₽`;

export const formatPricePerKm = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${moneyPrecise.format(v)} ₽/км`;

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatWeight = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${v} т`;

export const formatVolume = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${v} м³`;
