import * as React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/**
 * Поле даты с кнопкой-иконкой календаря внутри инпута.
 * Используем нативный date-picker браузера (input.showPicker()),
 * свою иконку показываем вместо системной (скрыта в index.css).
 */
function DateInput({ className, ...props }: React.ComponentProps<'input'>) {
  const ref = React.useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <input
        ref={ref}
        type="date"
        data-slot="input"
        className={cn(
          'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pr-8 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Открыть календарь"
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
        onClick={() => {
          const input = ref.current;
          if (!input) return;
          try {
            input.showPicker();
          } catch {
            // showPicker не поддержан/запрещён — просто фокус, откроется по клику.
            input.focus();
          }
        }}
      >
        <Calendar className="size-4" />
      </button>
    </div>
  );
}

export { DateInput };
