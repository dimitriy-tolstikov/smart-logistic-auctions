import { Link, Outlet } from '@tanstack/react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select.component';
import { useUiStore, type MockScenario } from '../providers/ui-store';
import { toRouterSearch } from '@/features/auction-filters/model/search-params';
import { Toaster } from '@/shared/ui/sonner.component';

export function RootLayout() {
  const { mockScenario, setMockScenario } = useUiStore();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" search={toRouterSearch({})} className="text-lg font-semibold">
            УЛ Лайт — Аукционы
          </Link>
          {import.meta.env.DEV && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden sm:inline">Мок-сценарий:</span>
              <Select
                value={mockScenario}
                onValueChange={(v) => setMockScenario(v as MockScenario)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Обычный режим</SelectItem>
                  <SelectItem value="401">Ошибка 401</SelectItem>
                  <SelectItem value="503">Ошибка 503</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
