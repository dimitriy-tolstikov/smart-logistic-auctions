import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { formatPrice, parsePrice } from '@/shared/lib/format-price';

interface AmountInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

/**
 * Числовой ввод цены с разделителями разрядов (12 000 000).
 * Хранит число, отображает форматированную строку.
 */
function AmountInput({ value, onChange, className, ...props }: AmountInputProps) {
  const [text, setText] = React.useState(() => formatPrice(value));
  const [focused, setFocused] = React.useState(false);

  // Внешнее изменение (сброс фильтров) — синхронизируем отображение.
  const formatted = formatPrice(value);
  if (!focused && text !== formatted) setText(formatted);

  return (
    <input
      type="text"
      inputMode="numeric"
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30',
        className,
      )}
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(formatPrice(value));
      }}
      onChange={(e) => {
        const parsed = parsePrice(e.target.value);
        onChange(parsed);
        setText(parsed === undefined ? '' : formatPrice(parsed));
      }}
      {...props}
    />
  );
}

export { AmountInput };
