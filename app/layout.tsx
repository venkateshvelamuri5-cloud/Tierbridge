import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui';

export const metadata: Metadata = {
  title: { default: 'Tierbridge: apartment maintenance, out in the open', template: '%s · Tierbridge' },
  description: 'A shared ledger for apartment societies. Residents pay by UPI and mark it with the reference number, admins verify it, and every expense carries its bill.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#176475' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="backdrop" aria-hidden="true"><i /><i /><i /></div>
        <ToastProvider>
          <div className="page">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
