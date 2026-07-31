import { create } from 'zustand';

export type MockScenario = 'off' | '401' | '503';

const STORAGE_KEY = 'ul-mock-scenario';

interface UiState {
  /** Сценарий ошибок MSW для ручной проверки error-состояний (точечный UI-state). */
  mockScenario: MockScenario;
  setMockScenario: (s: MockScenario) => void;
}

const readInitial = (): MockScenario => {
  if (typeof localStorage === 'undefined') return 'off';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === '401' || v === '503' ? v : 'off';
};

export const useUiStore = create<UiState>((set) => ({
  mockScenario: readInitial(),
  setMockScenario: (s) => {
    if (s === 'off') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, s);
    }
    set({ mockScenario: s });
  },
}));
