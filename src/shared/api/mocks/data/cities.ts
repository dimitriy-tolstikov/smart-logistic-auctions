/** Мок-словарь городов (gc_id — как в схеме load_gc_id/unload_gc_id). */
export const CITIES = [
  { name: 'Пермь', gc_id: 59 },
  { name: 'Москва', gc_id: 100 },
  { name: 'Санкт-Петербург', gc_id: 78 },
  { name: 'Екатеринбург', gc_id: 66 },
  { name: 'Казань', gc_id: 116 },
  { name: 'Новосибирск', gc_id: 54 },
  { name: 'Челябинск', gc_id: 74 },
  { name: 'Самара', gc_id: 63 },
  { name: 'Уфа', gc_id: 102 },
  { name: 'Краснодар', gc_id: 123 },
] as const;

export type MockCity = (typeof CITIES)[number];
