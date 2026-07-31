import type { components } from './schema';

export type ProblemDetail = components['schemas']['ProblemDetail'];
export type ValidationProblem = components['schemas']['ValidationProblem'];
export type ValidationErrorItem = components['schemas']['ValidationError'];

export function isValidationProblem(
  problem: ProblemDetail | ValidationProblem,
): problem is ValidationProblem {
  return problem.code === 'validation_failed' && 'errors' in problem;
}

/**
 * Ошибка API. Тело — ProblemDetail (RFC-стиль из схемы),
 * для 422 — ValidationProblem с массивом ошибок по полям.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail | ValidationProblem;

  constructor(status: number, problem: ProblemDetail | ValidationProblem) {
    super(problem.message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }

  get isValidation(): boolean {
    return isValidationProblem(this.problem);
  }

  /** Ошибки полей для 422; пустой массив для остальных статусов. */
  get fieldErrors(): ValidationErrorItem[] {
    return isValidationProblem(this.problem) ? this.problem.errors : [];
  }
}

type FetchResult<T> = {
  data?: T | undefined;
  error?: unknown;
  response: Response;
};

const isProblem = (e: unknown): e is ProblemDetail | ValidationProblem =>
  typeof e === 'object' && e !== null && 'message' in e && 'title' in e;

/**
 * Разворачивает результат openapi-fetch: отдаёт data либо бросает ApiError.
 * Тело ошибки — ProblemDetail/ValidationProblem из схемы; если сервер вернул
 * не-JSON (например, HTML 404 от dev-сервера, когда мок не перехватил запрос),
 * синтезируем понятный ProblemDetail по статусу. Сетевые сбои (TypeError)
 * тоже приводим к читаемому сообщению.
 */
export async function unwrap<T>(result: Promise<FetchResult<T>>): Promise<T> {
  let settled: FetchResult<T>;
  try {
    settled = await result;
  } catch (e) {
    throw new Error(
      `Сетевая ошибка: запрос не выполнен (${e instanceof Error ? e.message : String(e)})`,
      { cause: e },
    );
  }
  const { data, error, response } = settled;
  if (error !== undefined || !response.ok) {
    const problem: ProblemDetail | ValidationProblem = isProblem(error)
      ? error
      : {
          code: 'http_error',
          title: `HTTP ${response.status} ${response.statusText}`.trim(),
          message:
            'Сервер вернул ответ не в формате API. В dev-режиме это обычно значит, ' +
            'что мок-сервис (MSW) не перехватил запрос — обновите страницу.',
        };
    throw new ApiError(response.status, problem);
  }
  return data as T;
}
