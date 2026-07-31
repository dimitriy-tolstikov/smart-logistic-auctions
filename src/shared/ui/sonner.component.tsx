import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

/** Тосты приложения (shadcn-обёртка над sonner). */
function Toaster(props: ToasterProps) {
  return <SonnerToaster position="bottom-right" richColors closeButton {...props} />;
}

export { Toaster };
