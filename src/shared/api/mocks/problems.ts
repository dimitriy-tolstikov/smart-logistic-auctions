import { HttpResponse } from 'msw';
import type { ProblemDetail, ValidationProblem } from '@/shared/api/errors';

const traceId = () => Math.random().toString(16).slice(2).padStart(32, '0').slice(0, 32);

/** ProblemDetail-ответ (401/404/503) строго по схеме components/responses. */
export function problem(
  status: 401 | 404 | 503,
  code: string,
  title: string,
  message: string,
): HttpResponse<ProblemDetail> {
  return HttpResponse.json(
    { code, title, message, trace_id: traceId() },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

export const unauthorized = () =>
  problem(401, 'unauthorized', 'Не авторизован', 'Отсутствует или недействителен Bearer-токен.');

export const notFound = (message = 'Заявка не найдена') =>
  problem(404, 'resource_not_found', 'Не найдено', message);

export const unavailable = () =>
  problem(503, 'service_unavailable', 'Сервис недоступен', 'Временная недоступность upstream.');

/** 422 ValidationProblem с ошибками по полям. */
export function validationProblem(
  errors: Array<{ field: string; message: string; code?: string | null }>,
): HttpResponse<ValidationProblem> {
  return HttpResponse.json(
    {
      code: 'validation_failed',
      title: 'Ошибка валидации',
      message: 'Запрос содержит некорректные поля.',
      trace_id: traceId(),
      errors: errors.map((e) => ({ field: e.field, message: e.message, code: e.code ?? null })),
    },
    { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

type Scenario = '401' | '503' | null;

/**
 * Сценарий ошибок для ручной проверки: читается из localStorage
 * (ключ ul-mock-scenario = '401' | '503'). В node (тесты) всегда null.
 */
export function getScenario(): Scenario {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem('ul-mock-scenario');
  return v === '401' || v === '503' ? v : null;
}

export function scenarioResponse(): HttpResponse<ProblemDetail> | null {
  const s = getScenario();
  if (s === '401') return unauthorized();
  if (s === '503') return unavailable();
  return null;
}
