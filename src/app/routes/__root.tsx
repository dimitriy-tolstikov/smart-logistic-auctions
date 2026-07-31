import { createRootRoute } from '@tanstack/react-router';
import { RootLayout } from '@/app/layouts/root-layout.component';

export const Route = createRootRoute({
  component: RootLayout,
});
