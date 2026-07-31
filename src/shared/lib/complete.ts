/**
 * Рекурсивно убирает опциональность полей, сохраняя `| null`.
 * Соответствует семантике OpenAPI-схемы: поля в JSON присутствуют всегда,
 * но могут быть null там, где схема объявляет nullable.
 *
 * Сгенерированные типы (components без required) делают всё опциональным —
 * этот тип нужен на границах, где рантайм гарантирует полноту DTO (моки, тесты).
 */
export type Complete<T> = T extends (infer U)[]
  ? Complete<U>[]
  : T extends object
    ? { [K in keyof T]-?: Complete<T[K]> }
    : T;

/** Приведение DTO к Complete-форме (см. тип Complete). */
export const complete = <T>(value: T): Complete<T> => value as Complete<T>;
