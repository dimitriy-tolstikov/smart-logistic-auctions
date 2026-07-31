import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW-сервер для unit-тестов (node-среда). */
export const mockServer = setupServer(...handlers);
