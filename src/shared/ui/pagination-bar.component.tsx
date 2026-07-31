import { Button } from '@/shared/ui/button.component';

interface PaginationBarProps {
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ page, lastPage, total, onPageChange }: PaginationBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-muted-foreground text-sm">
        Страница {page} из {lastPage} · всего {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}
